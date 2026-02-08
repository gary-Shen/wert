import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  ReactNode,
} from "react";
import { View, StyleSheet, Pressable } from "react-native";
import BottomSheetLib, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetProps as LibProps,
} from "@gorhom/bottom-sheet";
import { cn } from "@/lib/utils";
import { Text } from "./text";

export interface SheetRef {
  open: () => void;
  close: () => void;
  snapTo: (index: number) => void;
}

export interface SheetProps {
  children: ReactNode;
  snapPoints?: (string | number)[];
  title?: string;
  onClose?: () => void;
  enablePanDownToClose?: boolean;
}

const Sheet = forwardRef<SheetRef, SheetProps>(
  (
    {
      children,
      snapPoints = ["50%", "90%"],
      title,
      onClose,
      enablePanDownToClose = true,
    },
    ref
  ) => {
    const bottomSheetRef = useRef<BottomSheetLib>(null);

    useImperativeHandle(ref, () => ({
      open: () => bottomSheetRef.current?.snapToIndex(0),
      close: () => bottomSheetRef.current?.close(),
      snapTo: (index: number) => bottomSheetRef.current?.snapToIndex(index),
    }));

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
        />
      ),
      []
    );

    const handleSheetChanges = useCallback(
      (index: number) => {
        if (index === -1) {
          onClose?.();
        }
      },
      [onClose]
    );

    return (
      <BottomSheetLib
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose={enablePanDownToClose}
        backdropComponent={renderBackdrop}
        onChange={handleSheetChanges}
        backgroundStyle={styles.background}
        handleIndicatorStyle={styles.indicator}
      >
        <BottomSheetView style={styles.content}>
          {title && (
            <View className="px-6 pb-4 border-b border-border">
              <Text variant="title" weight="bold">
                {title}
              </Text>
            </View>
          )}
          <View className="flex-1">{children}</View>
        </BottomSheetView>
      </BottomSheetLib>
    );
  }
);

Sheet.displayName = "Sheet";

const styles = StyleSheet.create({
  background: {
    backgroundColor: "#0a0a0a",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  indicator: {
    backgroundColor: "#737373",
    width: 40,
  },
  content: {
    flex: 1,
  },
});

export { Sheet };
