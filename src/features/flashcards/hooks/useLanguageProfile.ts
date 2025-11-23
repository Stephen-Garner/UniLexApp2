import { useEffect, useMemo } from 'react';
import { useLanguageProfileStore } from '@/state/language-profile.store';
import { resolveFlagGlyph } from '@/data/language-library';
import { DEFAULT_USER_ID } from '@/domain/user/constants';
import type { LanguageProfile } from '@/contracts/models';

export const useLanguageProfile = () => {
    const {
        profiles,
        activeProfileId,
        isLoaded: profilesLoaded,
        loadProfiles,
        ensureProfile,
      } = useLanguageProfileStore();
    
      useEffect(() => {
        loadProfiles().catch(() => undefined);
      }, [loadProfiles]);
    
      const activeProfile: LanguageProfile | undefined = activeProfileId
        ? profiles[activeProfileId]
        : undefined;
    
      const activeLanguageLabel = useMemo(() => {
        if (!activeProfile) {
          return '';
        }
        const glyph = resolveFlagGlyph(activeProfile.targetLanguage, activeProfile.targetRegion);
        return `${glyph} ${activeProfile.targetLanguage.toUpperCase()}`;
      }, [activeProfile]);
    
      useEffect(() => {
        if (!profilesLoaded) {
          return;
        }
        if (!activeProfile) {
          ensureProfile({
            userId: DEFAULT_USER_ID,
            nativeLanguage: 'en',
            targetLanguage: 'es',
            targetRegion: 'mx',
            makeActive: true,
          }).catch(() => undefined);
        }
      }, [profilesLoaded, activeProfile, ensureProfile]);

      return {
        activeProfile,
        activeLanguageLabel,
      }
}
