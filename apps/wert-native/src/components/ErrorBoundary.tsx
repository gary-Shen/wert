import React from "react";
import { View, Text, Pressable } from "react-native";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 32, backgroundColor: "#fff" }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>{"!"}</Text>
          <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 8, textAlign: "center" }}>
            {"Something went wrong"}
          </Text>
          <Text style={{ fontSize: 14, color: "#888", marginBottom: 24, textAlign: "center" }}>
            {this.state.error?.message || "An unexpected error occurred"}
          </Text>
          <Pressable
            onPress={this.handleRetry}
            style={{
              paddingHorizontal: 24,
              paddingVertical: 12,
              backgroundColor: "#000",
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
              {"Retry"}
            </Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}
