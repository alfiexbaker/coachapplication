import manifestData from '@/assets/just1/manifest.json';

export type AssetCategory = 'photos' | 'illustrations' | 'icons' | 'animations';

export interface AssetMetadata {
  slug: string;
  path: string;
  usage: string[];
  altText?: string;
  credits: string;
  tintToken?: string;
  aspectRatio?: string;
  size?: string;
  trigger?: string;
  duration?: number;
  easing?: string;
  haptic?: 'Light' | 'Selection' | 'Success' | 'Medium' | 'Heavy';
  voiceoverAnnouncement?: string | null;
}

class AssetManifest {
  private manifest: typeof manifestData;

  constructor() {
    this.manifest = manifestData;
  }

  /**
   * Get asset metadata by slug
   * @throws Error if asset not found or missing alt text
   */
  getAsset(slug: string, category?: AssetCategory): AssetMetadata | null {
    const categories = category ? [category] : (['photos', 'illustrations', 'icons', 'animations'] as AssetCategory[]);

    for (const cat of categories) {
      const assets = this.manifest.assets[cat];
      if (assets && slug in assets) {
        const asset = assets[slug as keyof typeof assets] as AssetMetadata;

        // Validate alt text for accessibility (except animations)
        if (cat !== 'animations' && !asset.altText) {
          console.warn(`Asset ${slug} is missing alt text for accessibility`);
        }

        return asset;
      }
    }

    return null;
  }

  /**
   * Get asset path with proper resolution
   */
  getAssetPath(slug: string, category?: AssetCategory): string | null {
    const asset = this.getAsset(slug, category);
    if (!asset) {
      console.error(`Asset "${slug}" not found in manifest`);
      return null;
    }
    return asset.path;
  }

  /**
   * Get all assets by usage context
   */
  getAssetsByUsage(usageContext: string): AssetMetadata[] {
    const results: AssetMetadata[] = [];

    for (const category of ['photos', 'illustrations', 'icons', 'animations'] as AssetCategory[]) {
      const assets = this.manifest.assets[category];
      if (assets) {
        Object.values(assets).forEach((asset) => {
          const metadata = asset as AssetMetadata;
          if (metadata.usage.includes(usageContext)) {
            results.push(metadata);
          }
        });
      }
    }

    return results;
  }

  /**
   * Validate that an asset exists before use
   */
  validateAsset(slug: string, requiredAltText: boolean = true): boolean {
    const asset = this.getAsset(slug);
    if (!asset) return false;
    if (requiredAltText && !asset.altText) return false;
    return true;
  }
}

export const assetManifest = new AssetManifest();

/**
 * Hook for components to access assets with type safety
 */
export function getAsset(slug: string, category?: AssetCategory): AssetMetadata | null {
  return assetManifest.getAsset(slug, category);
}

export function getAssetPath(slug: string, category?: AssetCategory): string | null {
  return assetManifest.getAssetPath(slug, category);
}
