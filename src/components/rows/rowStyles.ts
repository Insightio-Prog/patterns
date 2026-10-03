import { StyleSheet } from 'react-native';

import {
  color,
  font,
  fontSize,
  letterSpacing,
  space,
} from '@/theme/theme';

export const ROW_CELL_SIZE = 44;
export const ROW_NUMERAL_SIZE = 15;
export const ROW_VALUE_SIZE = 22;
export const CHIP_MARKER_SIZE = 7;
export const CHIP_RADIUS = 10;
export const CHECKLIST_TOGGLE_SIZE = 28;
export const CHECKMARK_SIZE = 14;

export const rowStyles = StyleSheet.create({
  rowLabel: {
    fontFamily: font.uiMedium,
    fontSize: fontSize.rowLabel,
    color: color.text2,
    marginBottom: space.sm,
  },
});
