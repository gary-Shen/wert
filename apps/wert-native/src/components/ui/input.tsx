import { forwardRef, useState } from "react";
import {
  TextInput,
  type TextInputProps,
  View,
  Pressable,
} from "react-native";
import { cn } from "@/lib/utils";
import { Text } from "./text";

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, leftIcon, rightIcon, className, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <View className="w-full">
        {label && (
          <Text variant="label" color="muted" className="mb-2">
            {label}
          </Text>
        )}
        <View
          className={cn(
            "flex-row items-center rounded-xl border bg-background px-4",
            isFocused ? "border-primary" : "border-border",
            error && "border-red-500",
            className
          )}
        >
          {leftIcon && <View className="mr-3">{leftIcon}</View>}
          <TextInput
            ref={ref}
            className={cn(
              "flex-1 h-12 text-base text-foreground",
              "placeholder:text-muted-foreground"
            )}
            placeholderTextColor="#737373"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />
          {rightIcon && <View className="ml-3">{rightIcon}</View>}
        </View>
        {error && (
          <Text variant="caption" color="error" className="mt-1">
            {error}
          </Text>
        )}
      </View>
    );
  }
);

Input.displayName = "Input";

export { Input };
