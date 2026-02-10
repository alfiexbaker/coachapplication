"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SurfaceCard = SurfaceCard;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const expo_image_1 = require("expo-image");
const Haptics = __importStar(require("expo-haptics"));
const react_native_reanimated_1 = __importStar(require("react-native-reanimated"));
const theme_1 = require("@/constants/theme");
const useTheme_1 = require("@/hooks/useTheme");
const AnimatedPressable = react_native_reanimated_1.default.createAnimatedComponent(react_native_1.Pressable);
const shimmerPresets = {
    light: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.9)', 'rgba(255,255,255,0)'],
    dark: ['rgba(0,0,0,0)', 'rgba(255,255,255,0.25)', 'rgba(0,0,0,0)'],
};
function SurfaceCard({ children, style, animateElevation = true, outlineGradient, gradientPadding = 2, loading = false, shimmerColors, haptics = true, tactile = true, disabled, onPressIn, onPressOut, onLayout, onPress, ...rest }) {
    const { colors: palette, scheme } = (0, useTheme_1.useTheme)();
    const baseShadow = theme_1.Shadows[scheme].card;
    const [cardSize, setCardSize] = (0, react_1.useState)({ width: 0, height: 0 });
    const scale = (0, react_native_reanimated_1.useSharedValue)(1);
    const pressed = (0, react_native_reanimated_1.useSharedValue)(0);
    const shimmerProgress = (0, react_native_reanimated_1.useSharedValue)(0);
    const interactive = tactile && Boolean((onPress || rest.onLongPress) && !disabled);
    (0, react_1.useEffect)(() => {
        if (loading && cardSize.width > 0) {
            shimmerProgress.value = (0, react_native_reanimated_1.withRepeat)((0, react_native_reanimated_1.withTiming)(1, { duration: 1600 }), -1, false);
        }
        else {
            shimmerProgress.value = 0;
        }
    }, [cardSize.width, loading, shimmerProgress]);
    const handleLayout = (event) => {
        setCardSize(event.nativeEvent.layout);
        onLayout?.(event);
    };
    const handlePressIn = (event) => {
        if (interactive) {
            pressed.value = (0, react_native_reanimated_1.withTiming)(1, { duration: 120 });
            scale.value = (0, react_native_reanimated_1.withSpring)(0.97, { damping: 18, stiffness: 320 });
            if (haptics) {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
        }
        onPressIn?.(event);
    };
    const handlePressOut = (event) => {
        if (interactive) {
            pressed.value = (0, react_native_reanimated_1.withTiming)(0, { duration: 150 });
            scale.value = (0, react_native_reanimated_1.withSpring)(1, { damping: 18, stiffness: 320 });
        }
        onPressOut?.(event);
    };
    const gradientUri = (0, react_1.useMemo)(() => {
        if (!outlineGradient) {
            return null;
        }
        return buildLinearGradientUri(outlineGradient, theme_1.Radii.lg + gradientPadding);
    }, [gradientPadding, outlineGradient]);
    const shimmerGradientUri = (0, react_1.useMemo)(() => {
        const colors = shimmerColors ?? shimmerPresets[scheme];
        return buildLinearGradientUri([...colors], theme_1.Radii.lg);
    }, [scheme, shimmerColors]);
    const animatedCardStyle = (0, react_native_reanimated_1.useAnimatedStyle)(() => {
        const pressedBackground = scheme === 'light'
            ? lightenHex(palette.card, 0.04)
            : darkenHex(palette.card, 0.06);
        const pressedBorder = scheme === 'light'
            ? lightenHex(palette.border, 0.25)
            : lightenHex(palette.border, 0.1);
        const shadowOpacity = animateElevation
            ? baseShadow.shadowOpacity + pressed.value * (scheme === 'light' ? 0.08 : 0.1)
            : baseShadow.shadowOpacity;
        const shadowRadius = animateElevation
            ? baseShadow.shadowRadius + pressed.value * -2
            : baseShadow.shadowRadius;
        const elevation = animateElevation
            ? baseShadow.elevation + pressed.value * 2
            : baseShadow.elevation;
        const shadowOffsetHeight = animateElevation
            ? baseShadow.shadowOffset.height + pressed.value * -2
            : baseShadow.shadowOffset.height;
        return {
            transform: [{ scale: scale.value }],
            backgroundColor: (0, react_native_reanimated_1.interpolateColor)(pressed.value, [0, 1], [palette.card, pressedBackground]),
            borderColor: (0, react_native_reanimated_1.interpolateColor)(pressed.value, [0, 1], [palette.border, pressedBorder]),
            shadowColor: baseShadow.shadowColor,
            shadowOpacity,
            shadowRadius,
            shadowOffset: { width: baseShadow.shadowOffset.width, height: shadowOffsetHeight },
            elevation,
        };
    }, [animateElevation, baseShadow, palette.border, palette.card, scheme]);
    const shimmerAnimatedStyle = (0, react_native_reanimated_1.useAnimatedStyle)(() => {
        if (!loading || cardSize.width === 0) {
            return { opacity: 0 };
        }
        const shimmerWidth = Math.max(cardSize.width * 0.45, 120);
        const translateX = (0, react_native_reanimated_1.interpolate)(shimmerProgress.value, [0, 1], [-shimmerWidth, cardSize.width + shimmerWidth]);
        return {
            opacity: 0.55,
            transform: [{ translateX }],
        };
    }, [cardSize.width, loading]);
    const card = ((0, jsx_runtime_1.jsxs)(AnimatedPressable, { accessibilityRole: onPress ? 'button' : undefined, ...rest, disabled: disabled, onLayout: handleLayout, onPressIn: handlePressIn, onPressOut: handlePressOut, onPress: onPress, style: [
            styles.card,
            {
                backgroundColor: palette.card,
                borderColor: palette.border,
                shadowColor: baseShadow.shadowColor,
                shadowOpacity: baseShadow.shadowOpacity,
                shadowRadius: baseShadow.shadowRadius,
                shadowOffset: baseShadow.shadowOffset,
                elevation: baseShadow.elevation,
            },
            animatedCardStyle,
            style,
        ], children: [children, loading ? ((0, jsx_runtime_1.jsx)(react_native_1.View, { pointerEvents: "none", style: styles.shimmerOverlay, children: (0, jsx_runtime_1.jsx)(react_native_reanimated_1.default.View, { style: [styles.shimmerBand, shimmerAnimatedStyle], children: (0, jsx_runtime_1.jsx)(expo_image_1.Image, { pointerEvents: "none", source: { uri: shimmerGradientUri }, style: [styles.shimmerGradient, { height: cardSize.height || '100%' }], contentFit: "cover" }) }) })) : null] }));
    if (!outlineGradient) {
        return card;
    }
    return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: [styles.gradientWrapper, { padding: gradientPadding }], children: [gradientUri ? ((0, jsx_runtime_1.jsx)(expo_image_1.Image, { pointerEvents: "none", source: { uri: gradientUri }, style: [react_native_1.StyleSheet.absoluteFillObject, { borderRadius: theme_1.Radii.lg + gradientPadding }], contentFit: "cover" })) : null, card] }));
}
function buildLinearGradientUri(colors, radius) {
    const stops = colors
        .map((color, index) => {
        const offset = (index / Math.max(colors.length - 1, 1)) * 100;
        return `<stop offset="${offset}%" stop-color="${color}" />`;
    })
        .join('');
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      ${stops}
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="100" height="100" rx="${radius}" ry="${radius}" fill="url(#grad)" />
</svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
function lightenHex(hex, amount) {
    return mixHex(hex, '#ffffff', amount);
}
function darkenHex(hex, amount) {
    return mixHex(hex, '#000000', amount);
}
function mixHex(base, mix, amount) {
    const baseRgb = hexToRgb(base);
    const mixRgb = hexToRgb(mix);
    if (!baseRgb || !mixRgb) {
        return base;
    }
    const blendChannel = (channelBase, channelMix) => Math.round(channelBase + (channelMix - channelBase) * amount);
    const r = blendChannel(baseRgb.r, mixRgb.r);
    const g = blendChannel(baseRgb.g, mixRgb.g);
    const b = blendChannel(baseRgb.b, mixRgb.b);
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function hexToRgb(hex) {
    const normalized = hex.replace('#', '');
    if (normalized.length !== 6) {
        return null;
    }
    const bigint = parseInt(normalized, 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255,
    };
}
function toHex(value) {
    return value.toString(16).padStart(2, '0');
}
const styles = react_native_1.StyleSheet.create({
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
