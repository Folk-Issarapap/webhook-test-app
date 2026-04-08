"use client";

import { useState, useCallback } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface KeyValuePair {
  id: string;
  key: string;
  value: string;
}

interface KeyValueInputProps {
  value: Record<string, string | number | boolean>;
  onChange: (value: Record<string, string | number | boolean>) => void;
  className?: string;
  placeholder?: {
    key?: string;
    value?: string;
  };
  autoParseValues?: boolean; // If false, keep all values as strings (for headers)
}

export function KeyValueInput({
  value,
  onChange,
  className,
  placeholder = { key: "key", value: "value" },
  autoParseValues = true,
}: KeyValueInputProps) {
  const [pairs, setPairs] = useState<KeyValuePair[]>(() => {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return [{ id: crypto.randomUUID(), key: "", value: "" }];
    }
    return entries.map(([key, val]) => ({
      id: crypto.randomUUID(),
      key,
      value: String(val),
    }));
  });

  const updatePairs = useCallback(
    (newPairs: KeyValuePair[]) => {
      setPairs(newPairs);
      const obj: Record<string, string | number | boolean> = {};
      newPairs.forEach(({ key, value: val }) => {
        if (key.trim()) {
          if (autoParseValues) {
            // Try to parse as number or boolean
            if (val === "true") obj[key] = true;
            else if (val === "false") obj[key] = false;
            else if (!isNaN(Number(val)) && val !== "") obj[key] = Number(val);
            else obj[key] = val;
          } else {
            // Keep as string (for headers)
            obj[key] = val;
          }
        }
      });
      onChange(obj);
    },
    [onChange, autoParseValues],
  );

  const addPair = useCallback(() => {
    updatePairs([...pairs, { id: crypto.randomUUID(), key: "", value: "" }]);
  }, [pairs, updatePairs]);

  const removePair = useCallback(
    (id: string) => {
      if (pairs.length === 1) {
        updatePairs([{ id: crypto.randomUUID(), key: "", value: "" }]);
      } else {
        updatePairs(pairs.filter((p) => p.id !== id));
      }
    },
    [pairs, updatePairs],
  );

  const updatePair = useCallback(
    (id: string, field: "key" | "value", newValue: string) => {
      updatePairs(
        pairs.map((p) => (p.id === id ? { ...p, [field]: newValue } : p)),
      );
    },
    [pairs, updatePairs],
  );

  return (
    <div className={cn("space-y-2", className)}>
      {pairs.map((pair, index) => (
        <div
          key={pair.id}
          className="group flex items-center gap-2 animate-in"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className="flex-1 flex gap-2">
            <Input
              placeholder={placeholder.key}
              value={pair.key}
              onChange={(e) => updatePair(pair.id, "key", e.target.value)}
              className="flex-1 font-mono text-sm bg-surface border-border-subtle 
                         focus:border-primary/50 focus:ring-primary/20
                         placeholder:text-muted-foreground/50"
            />
            <span className="flex items-center text-muted-foreground/50">
              :
            </span>
            <Input
              placeholder={placeholder.value}
              value={pair.value}
              onChange={(e) => updatePair(pair.id, "value", e.target.value)}
              className="flex-1 text-sm bg-surface border-border-subtle
                         focus:border-primary/50 focus:ring-primary/20
                         placeholder:text-muted-foreground/50"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removePair(pair.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity
                       text-muted-foreground hover:text-destructive
                       hover:bg-destructive-subtle"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <Button
        variant="ghost"
        onClick={addPair}
        className="w-full h-9 border border-dashed border-border-subtle
                   text-muted-foreground hover:text-foreground
                   hover:border-primary/30 hover:bg-primary-subtle/30
                   transition-all duration-200"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add field
      </Button>
    </div>
  );
}
