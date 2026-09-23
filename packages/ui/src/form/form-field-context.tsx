'use client';

import { createContext, useContext } from 'react';

export interface FormFieldContextValue {
  /** id of the control — FormLabel points at it with htmlFor. */
  controlId: string;
  /** id of the FormLabel — groups such as RadioGroup use it as their accessible name. */
  labelId: string;
  descriptionId: string;
  messageId: string;
  /** Error text, or true for an error state without text. */
  error: string | boolean | undefined;
  success: boolean;
  required: boolean;
  disabled: boolean;
  /** Set by FormDescription / FormMessage when they render, so controls can link to them. */
  hasDescription: boolean;
  hasMessage: boolean;
  setHasDescription: (value: boolean) => void;
  setHasMessage: (value: boolean) => void;
}

export const FormFieldContext = createContext<FormFieldContextValue | null>(null);

/**
 * The surrounding FormField's state, or null when a control is used on its own.
 * Every control works in both cases.
 */
export function useFormField(): FormFieldContextValue | null {
  return useContext(FormFieldContext);
}

/** Builds aria-describedby from whichever helper texts are actually on screen. */
export function describedByFor(field: FormFieldContextValue | null): string | undefined {
  if (!field) return undefined;
  const ids = [
    field.hasDescription ? field.descriptionId : null,
    field.hasMessage ? field.messageId : null,
  ].filter((id): id is string => id !== null);
  return ids.length > 0 ? ids.join(' ') : undefined;
}
