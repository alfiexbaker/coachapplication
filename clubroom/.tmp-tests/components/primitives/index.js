"use strict";
/**
 * Primitives Index
 *
 * Central export for all primitive components and styles.
 * Import from here instead of individual files for cleaner imports.
 *
 * Usage:
 *   import { SurfaceCard, Clickable, StatCard } from '@/components/primitives';
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Center = exports.Spacer = exports.Column = exports.Row = exports.SCREEN_TYPOGRAPHY = exports.ScreenHeader = exports.SectionHeader = exports.PageHeader = exports.StatCard = exports.Clickable = exports.SurfaceCard = void 0;
// Components
var surface_card_1 = require("./surface-card");
Object.defineProperty(exports, "SurfaceCard", { enumerable: true, get: function () { return surface_card_1.SurfaceCard; } });
var clickable_1 = require("./clickable");
Object.defineProperty(exports, "Clickable", { enumerable: true, get: function () { return clickable_1.Clickable; } });
var stat_card_1 = require("./stat-card");
Object.defineProperty(exports, "StatCard", { enumerable: true, get: function () { return stat_card_1.StatCard; } });
var page_header_1 = require("./page-header");
Object.defineProperty(exports, "PageHeader", { enumerable: true, get: function () { return page_header_1.PageHeader; } });
var section_header_1 = require("./section-header");
Object.defineProperty(exports, "SectionHeader", { enumerable: true, get: function () { return section_header_1.SectionHeader; } });
var screen_header_1 = require("./screen-header");
Object.defineProperty(exports, "ScreenHeader", { enumerable: true, get: function () { return screen_header_1.ScreenHeader; } });
Object.defineProperty(exports, "SCREEN_TYPOGRAPHY", { enumerable: true, get: function () { return screen_header_1.SCREEN_TYPOGRAPHY; } });
// Layout primitives
var row_1 = require("./row");
Object.defineProperty(exports, "Row", { enumerable: true, get: function () { return row_1.Row; } });
var column_1 = require("./column");
Object.defineProperty(exports, "Column", { enumerable: true, get: function () { return column_1.Column; } });
var spacer_1 = require("./spacer");
Object.defineProperty(exports, "Spacer", { enumerable: true, get: function () { return spacer_1.Spacer; } });
var center_1 = require("./center");
Object.defineProperty(exports, "Center", { enumerable: true, get: function () { return center_1.Center; } });
