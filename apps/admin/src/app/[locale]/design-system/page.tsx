import type { ReactNode } from 'react';
import { PageShell } from '@afaq/ui';
import { ButtonShowcase } from './button-showcase';
import { ChoiceShowcase } from './choice-showcase';
import { ColorShowcase } from './color-showcase';
import { DisplayShowcase } from './display-showcase';
import { FloatingShowcase } from './floating-showcase';
import { FormIntegration } from './form-integration';
import { FormShowcase } from './form-showcase';
import { LayoutShowcase } from './layout-showcase';
import { LocaleShowcase } from './locale-showcase';
import { LottieShowcase } from './lottie-showcase';
import { MotionShowcase } from './motion-showcase';
import { NavigationShowcase } from './navigation-showcase';
import { OverlayShowcase } from './overlay-showcase';
import { ShowcaseSection } from './showcase-section';
import { StateShowcase } from './state-showcase';
import { TableShowcase } from './table-showcase';
import { ThemeTester } from './theme-tester';
import { TypographyShowcase } from './typography-showcase';

export default function DesignSystemPage(): ReactNode {
  return (
    <PageShell
      eyebrow="Development only"
      title="Design System"
      description="Visual reference for tokens, typography and components. Removed before production."
    >
      <ShowcaseSection title="Theme">
        <ThemeTester />
      </ShowcaseSection>

      <LocaleShowcase />
      <LottieShowcase />
      <MotionShowcase />
      <StateShowcase />
      <TableShowcase />
      <NavigationShowcase />
      <FloatingShowcase />
      <OverlayShowcase />
      <DisplayShowcase />
      <FormIntegration />
      <ChoiceShowcase />
      <FormShowcase />
      <ButtonShowcase />
      <TypographyShowcase />
      <ColorShowcase />
      <LayoutShowcase />
    </PageShell>
  );
}
