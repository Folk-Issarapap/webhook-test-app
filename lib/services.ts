/**
 * Service container entry point (see ARCHITECTURE.md §5).
 * Add lazy getters for D1-backed webhook services as you implement them.
 */
export class ServiceContainer {
  private static _instance: ServiceContainer | undefined;

  static getInstance(): ServiceContainer {
    if (!ServiceContainer._instance) {
      ServiceContainer._instance = new ServiceContainer();
    }
    return ServiceContainer._instance;
  }
}

export const getServices = () => ServiceContainer.getInstance();
