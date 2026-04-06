# apps/admin — Architecture Guide

> A reference for understanding the folder structure, authentication flow, server actions, services, pages, and form patterns used in this Next.js admin application.

---

## Table of Contents

1. [Folder Structure](#1-folder-structure)
2. [Auth Flow — Login](#2-auth-flow--login)
3. [Session Management](#3-session-management)
4. [Server Actions Pattern](#4-server-actions-pattern)
5. [Service Layer](#5-service-layer)
6. [Pages & Routing](#6-pages--routing)
7. [Forms + Actions Together](#7-forms--actions-together)
8. [Validation Schemas](#8-validation-schemas)
9. [Authorization (RBAC)](#9-authorization-rbac)
10. [i18n](#10-i18n)
11. [Key Technologies](#11-key-technologies)

---

## 1. Folder Structure

```
apps/admin/
├── actions/                  # Server actions (mutations & queries)
│   ├── auth/                 # login, logout, forgot/reset password
│   ├── merchants/
│   ├── customers/
│   ├── payments/
│   ├── settlements/
│   ├── wallets/
│   ├── providers/
│   ├── integrations/
│   ├── webhooks/
│   ├── roles/
│   ├── permissions/
│   ├── accounts/
│   ├── profile/
│   ├── transactions/
│   ├── dashboard/
│   └── ...
│
├── app/
│   └── [lang]/
│       ├── (public)/          # Unauthenticated routes
│       │   ├── login/
│       │   ├── forgot-password/
│       │   ├── reset-password/
│       │   └── auth/
│       │       ├── accept-invite/
│       │       ├── change-password/
│       │       ├── inactive/
│       │       └── unauthorized/
│       │
│       └── (authenticate)/    # Protected routes (auth required)
│           ├── customers/
│           ├── merchants/
│           ├── payments/
│           ├── settlements/
│           ├── accounts/
│           ├── wallets/
│           ├── withdraws/
│           ├── providers/
│           ├── integrations/
│           ├── webhooks/
│           ├── rbac/
│           ├── profile/
│           └── operation-logs/
│
├── components/               # React components
│   ├── auth/                 # LoginForm, ForgotPasswordForm, etc.
│   ├── authorization/        # Can, Unauthorized, AbilityProviderWrapper
│   ├── providers/            # AuthProvider, ThemeProvider, etc.
│   ├── layouts/              # Sidebar, NavigationMenu, PageHeading
│   ├── breadcrumb/
│   └── [domain]/             # Domain-specific components
│
├── lib/
│   ├── auth/                 # getCurrentUser(), Supabase server client
│   ├── authorization/        # requirePermission(), withAuthorization()
│   ├── services.ts           # Service container (singleton DI)
│   ├── i18n/
│   ├── utils/
│   ├── cache/
│   ├── rate-limit/
│   └── queues/
│
├── schemas/                  # Zod validation schemas (per domain)
│   ├── auth.schema.ts
│   ├── merchant.schema.ts
│   ├── customer.schema.ts
│   └── ...
│
└── messages/                 # i18n translation files
    ├── en/
    └── th/
```

---

## 2. Auth Flow — Login

### Files Involved

| Role | File |
|------|------|
| Page | `app/[lang]/(public)/login/page.tsx` |
| Form (client) | `components/auth/login-form.tsx` |
| Server Action | `actions/auth/auth.action.ts` → `login()` |
| Validation | `schemas/auth.schema.ts` → `createAuthSchemas()` |
| Auth Context | `components/providers/auth-provider.tsx` |
| Session util | `lib/auth/get-current-user.ts` |

### Step-by-step Flow

```
1. User visits /[lang]/login
        ↓
2. LoginPage (server component) renders LoginForm
        ↓
3. User fills in email + password
        ↓
4. React Hook Form runs client-side Zod validation (onChange)
        ↓
5. On submit, form builds FormData and calls login() server action
        ↓
6. Server: rate limit check → Zod schema validation
        ↓
7. Server: supabase.auth.signInWithPassword()
        ↓
8. Server: log operation (success or failure)
        ↓
9. Server: return { success, message, redirectTo }
        ↓
10. Client: on success → refreshUser() → router.push(redirectTo)
```

### Login Page (Server Component)

```typescript
// app/[lang]/(public)/login/page.tsx
export default async function LoginPage({ searchParams }) {
  const { redirect } = await searchParams;
  return <LoginForm redirectTo={redirect} />;
}
```

### Login Form (Client Component) — key structure

```typescript
'use client';

export function LoginForm({ redirectTo }: LoginFormProps) {
  const t = useTranslations('auth');
  const { refreshUser } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(schemas.loginSchema),
    mode: 'onChange',
    defaultValues: { email: '', password: '', redirectTo },
  });

  const onSubmit = async (data: LoginFormValues) => {
    const formData = new FormData();
    formData.append('email', data.email);
    formData.append('password', data.password);

    const result = await login(null, formData);   // call server action

    if (!result.success) {
      setServerError(result.message);
      return;
    }

    await refreshUser();
    router.push(result.redirectTo ?? '/');
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Controller name="email" control={form.control} render={...} />
      <Controller name="password" control={form.control} render={...} />
      {serverError && <Alert>{serverError}</Alert>}
      <Button type="submit" disabled={form.formState.isSubmitting}>
        Sign In
      </Button>
    </form>
  );
}
```

### Login Server Action

```typescript
// actions/auth/auth.action.ts
'use server';

export async function login(
  _: LoginState | null,
  formData: FormData
): Promise<LoginState> {
  await rateLimitAction();                          // 1. rate limit

  const t = await getTranslations('auth');
  const schema = createAuthSchemas(tCommon, t).loginSchema;
  const parsed = schema.safeParse({                // 2. validate
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { success: false, message: parsed.error... };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data); // 3. auth

  if (error) {
    await logService.logFailedLogin(...);
    return { success: false, message: await translateError(error) };
  }

  await logService.logSuccessLogin(...);           // 4. log
  return { success: true, message: t('login.success'), redirectTo: '/' };
}
```

---

## 3. Session Management

### Server-side

```typescript
// lib/auth/get-current-user.ts
export async function getCurrentUser(): Promise<UserContext> {
  const supabase = await createSupabaseServerAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  // user.user_metadata.role contains the user's role
  return { id: user.id, email: user.email, role: user.user_metadata.role };
}
```

- Always validates with Supabase Auth server (not local JWT)
- Called in protected layouts to load the current user

### Client-side — AuthProvider

```typescript
// components/providers/auth-provider.tsx
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      // Events: INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED, SIGNED_OUT
      if (session) {
        const { data } = await supabase.auth.getUser(); // always verify
        setUser(data.user);
      } else {
        setUser(null);
      }
    });
  }, []);

  return <AuthContext.Provider value={{ user, signOut, refreshUser }}>;
}

// Usage anywhere in the app:
const { user, signOut, refreshUser } = useAuth();
```

---

## 4. Server Actions Pattern

### File naming convention

| Suffix | Purpose |
|--------|---------|
| `*.mutation.action.ts` | Create / Update / Delete |
| `*.query.action.ts` | Read / List / Fetch |
| `auth.action.ts` | Auth-specific (login, logout, etc.) |

### Anatomy of a mutation action

```typescript
'use server';

// 1. Define state shape (returned to client)
export interface CreateMerchantState {
  success: boolean;
  message: string;
  formData?: FormData;   // echo back for repopulating form on error
  merchantId?: string;
}

// 2. Action function signature — compatible with useActionState()
export async function createMerchant(
  prevState: CreateMerchantState | null,
  formData: FormData
): Promise<CreateMerchantState> {

  // Step 1: Rate limit
  try { await rateLimitAction(); }
  catch (e) { return { success: false, message: translateError(e) }; }

  // Step 2: Load translations
  const t = await getTranslations('merchants');

  // Step 3: Authorization
  await requirePermission('create', 'Merchant');

  // Step 4: Extract FormData
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;

  // Step 5: Validate with Zod
  const result = schemas.createMerchantSchema.safeParse({ name, email });
  if (!result.success) {
    return { success: false, message: result.error.issues[0].message, formData };
  }

  // Step 6: Call service
  const service = await getServices().getMerchantService();
  const merchant = await service.create(result.data);

  // Step 7: Log operation
  await logService.create({ actorId, operation: 'create_merchant', resourceId: merchant.id });

  // Step 8: Revalidate cache
  revalidatePath('/merchants');

  // Step 9: Return
  return { success: true, message: t('created'), merchantId: merchant.id };
}
```

### Using an action in a form (useActionState)

```typescript
'use client';

export function CreateMerchantForm() {
  const [state, formAction, isPending] = useActionState(createMerchant, null);

  useEffect(() => {
    if (state?.success) toast.success(state.message);
    if (state && !state.success) toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction}>
      <input name="name" defaultValue={state?.formData?.get('name') ?? ''} />
      <Button type="submit" disabled={isPending}>Create</Button>
    </form>
  );
}
```

> Alternatively, forms can call the server action directly with React Hook Form (see [Section 7](#7-forms--actions-together)).

---

## 5. Service Layer

### Service Container — `lib/services.ts`

Singleton class with lazy-initialized, dependency-injected services.

```typescript
class ServiceContainer {
  private static instance: ServiceContainer;

  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  async getMerchantService(): Promise<MerchantService> {
    if (!this._merchantService) {
      const supabase = await createSupabaseServerAdminClient();
      this._merchantService = new MerchantService(
        supabase,
        logger,
        this.getFeeConfigurationService(),
        await this.getWalletService(),
      );
    }
    return this._merchantService;
  }
  // ... one getter per service
}

export const getServices = () => ServiceContainer.getInstance();
```

### Usage in an action

```typescript
const merchantService = await getServices().getMerchantService();
const merchant = await merchantService.create({ name, email });
```

### Available services (grouped)

| Group | Services |
|-------|---------|
| Auth / Accounts | AccountService, ProfileService |
| Merchants | MerchantService, MerchantMembershipService, MerchantBankAccountService |
| Wallets | WalletService, WalletLedgerService, WalletTransactionService, WalletProviderService |
| Payments | PaymentService, PaymentAccessTokenService |
| Providers | ProviderService, ProviderCredentialService, ProviderCapabilityService, ProviderHealthService |
| Integrations | IntegrationService, IntegrationHmacCredentialsService, IntegrationAllocationService |
| Settlements | SettlementService, SettlementFeeCalculationService |
| RBAC | RBACService |
| Customers | CustomerService, CustomerBankAccountService |
| Webhooks | WebhookEndpointService, WebhookDeliveryService, WebhookDispatcherService |
| Logging | OperationLogService |

> Services themselves live in the shared workspace (outside `apps/admin`) and are imported here.

---

## 6. Pages & Routing

### Route Groups

| Group | Path pattern | Purpose |
|-------|-------------|---------|
| `(public)` | `/[lang]/login`, `/[lang]/forgot-password`, etc. | No auth required |
| `(authenticate)` | `/[lang]/customers`, `/[lang]/merchants`, etc. | Requires valid session |

### Authenticated Layout

`app/[lang]/(authenticate)/layout.tsx` runs on every protected route:
1. Calls `getCurrentUser()` — redirects to `/login` if unauthenticated
2. Builds CASL ability rules from the user's role/permissions
3. Wraps children in `<AbilityProviderWrapper>` for frontend permission checks

### Page Pattern (Server Component)

```typescript
// app/[lang]/(authenticate)/customers/(table)/page.tsx
export default async function CustomersPage({ searchParams }) {
  const [t, params, merchants] = await Promise.all([
    getTranslations('customers'),
    customerLoadSearchParams(searchParams),
    getCachedMerchantsForFilters({ status: 'active' }),
  ]);

  return (
    <Can I="read" a="Customer" fallback={<Unauthorized />}>
      <PageHeading>
        <PageHeadingTitle>{t('title')}</PageHeadingTitle>
        <PageHeadingActions>
          <CustomerCreateButton />
        </PageHeadingActions>
      </PageHeading>

      <Suspense fallback={<CustomerTableSkeleton />}>
        <CustomerTable searchParams={searchParams} />
      </Suspense>
    </Can>
  );
}
```

### Parallel Routes for Modals / Sheets

```
customers/
├── @sheet/               # Slot — renders alongside the page
│   ├── (.)create/        # Intercept route for create sheet
│   └── (.)bank-accounts/[id]/
├── (table)/
│   └── page.tsx
└── [id]/
    └── page.tsx
```

The `@sheet` slot renders a side-sheet or dialog without navigating away from the table.

---

## 7. Forms + Actions Together

There are two patterns in use, depending on complexity.

### Pattern A: React Hook Form → manual FormData → server action

Best for: login, complex forms with client-side validation, dynamic fields.

```
User fills form
    ↓
React Hook Form validates (Zod, onChange mode)
    ↓
form.handleSubmit(onSubmit) fires
    ↓
onSubmit builds FormData manually
    ↓
calls serverAction(null, formData)    ← direct async call
    ↓
handles returned { success, message } in client
    ↓
shows toast, redirects, or displays error
```

```typescript
const onSubmit = async (data: FormValues) => {
  const fd = new FormData();
  fd.append('name', data.name);
  const result = await createMerchant(null, fd);   // direct call
  if (result.success) router.push('/merchants');
  else setServerError(result.message);
};
```

### Pattern B: Native form action → useActionState

Best for: simple forms, progressive enhancement, no complex client validation needed.

```typescript
const [state, formAction, isPending] = useActionState(createMerchant, null);

return (
  <form action={formAction}>
    <input name="name" />
    <Button disabled={isPending}>Save</Button>
    {state && !state.success && <p>{state.message}</p>}
  </form>
);
```

### Which to use?

| Situation | Pattern |
|-----------|---------|
| Complex validation, multi-step | A (React Hook Form) |
| Simple CRUD forms | B (useActionState) |
| Need to repopulate form on error | B (state.formData echoed back) |
| Need real-time field feedback | A (mode: 'onChange') |

---

## 8. Validation Schemas

Schemas live in `schemas/[domain].schema.ts` and are **factory functions** that accept translation functions — so error messages are always i18n-aware.

```typescript
// schemas/auth.schema.ts
export function createAuthSchemas(
  tCommon: TranslationFunction,
  tAuth: TranslationFunction,
) {
  const loginSchema = z.object({
    email: z
      .string()
      .min(1, tCommon('validation.required', { field: tAuth('fields.email.label') }))
      .max(AUTH.EMAIL.MAX_LENGTH, tCommon('validation.maxLength', { max: ... }))
      .refine(AUTH.EMAIL.isValid, tCommon('validation.email')),
    password: z
      .string()
      .min(AUTH.PASSWORD.MIN_LENGTH, ...)
      .max(AUTH.PASSWORD.MAX_LENGTH, ...),
    redirectTo: z.string().optional(),
  });

  return { loginSchema, forgotPasswordSchema, resetPasswordSchema };
}
```

**Usage in a server action:**

```typescript
const t = await getTranslations('auth');
const tCommon = await getTranslations('common');
const { loginSchema } = createAuthSchemas(tCommon, t);
const result = loginSchema.safeParse({ email, password });
```

**Usage in a client form:**

```typescript
const t = useTranslations('auth');
const tCommon = useTranslations('common');
const { loginSchema } = createAuthSchemas(tCommon, t);
const form = useForm({ resolver: zodResolver(loginSchema) });
```

---

## 9. Authorization (RBAC)

The app uses **CASL** for both server-side and client-side permission checks.

### Server-side — inside a server action

```typescript
// Throws if the current user lacks permission
await requirePermission('create', 'Merchant');
await requirePermission('delete', 'Customer');
```

### Client-side — in a component

```typescript
// Render content only if user has permission
<Can I="read" a="Customer" fallback={<Unauthorized />}>
  <CustomerTable />
</Can>

// Or check imperatively
const ability = useAbility();
if (ability.can('update', 'Merchant')) { ... }
```

### How rules are built

`(authenticate)/layout.tsx` calls `getRulesForUser(user)` and passes the rules to `<AbilityProviderWrapper>`, which provides them via React Context to all child components.

---

## 10. i18n

- Library: **next-intl**
- Languages: `en` (English), `th` (Thai)
- Translation files: `messages/[lang]/[domain].json`
- Route prefix: `/[lang]/...` (e.g. `/en/merchants`, `/th/merchants`)

**In server components / actions:**

```typescript
const t = await getTranslations('merchants');
t('title');                        // → "Merchants"
t('validation.required', { field: t('fields.name') });
```

**In client components:**

```typescript
const t = useTranslations('merchants');
```

---

## 11. Key Technologies

| Category | Technology |
|----------|-----------|
| Framework | Next.js (App Router) |
| Language | TypeScript (strict) |
| Auth | Supabase Auth (JWT) |
| Database | Supabase + Drizzle ORM |
| Forms | React Hook Form |
| Validation | Zod |
| Authorization | CASL |
| UI | shadcn/ui + Tailwind CSS |
| Tables | TanStack React Table |
| Toast | Sonner |
| i18n | next-intl |
| URL state | nuqs |
| Testing | Playwright (e2e) |

---

## Quick Reference: Adding a New Feature

### 1. Create the schema
```
schemas/[domain].schema.ts
```
Export a factory function `create[Domain]Schemas(tCommon, tDomain)`.

### 2. Create the server action
```
actions/[domain]/[domain].mutation.action.ts
```
Follow the 9-step pattern: rate limit → translate → authorize → extract FormData → validate → call service → log → revalidate → return state.

### 3. Create the page (server component)
```
app/[lang]/(authenticate)/[domain]/page.tsx
```
Wrap with `<Can I="read" a="[Resource]">`, use `<Suspense>` for data loading.

### 4. Create the form (client component)
```
components/[domain]/[domain]-form.tsx
```
Use React Hook Form + `zodResolver`. Call the server action in `onSubmit`. Display server errors from returned state.

### 5. Add translations
```
messages/en/[domain].json
messages/th/[domain].json
```
