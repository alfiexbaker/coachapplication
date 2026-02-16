"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.styles = void 0;
const react_native_1 = require("react-native");
const theme_1 = require("@/constants/theme");
exports.styles = react_native_1.StyleSheet.create({
    card: {
        borderRadius: theme_1.Radii.lg,
        padding: theme_1.Spacing.md,
        borderWidth: 0.75,
        overflow: 'hidden',
    },
    shimmerOverlay: {
        ...react_native_1.StyleSheet.absoluteFillObject,
        borderRadius: theme_1.Radii.lg,
    },
    shimmerBand: {
        width: '45%',
        height: '100%',
    },
    shimmerGradient: {
        width: '100%',
    },
    gradientWrapper: {
        position: 'relative',
        borderRadius: theme_1.Radii.lg,
        overflow: 'hidden',
    },
});
