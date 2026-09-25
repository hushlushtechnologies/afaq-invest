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
import { ShowcaseToc } from './showcase-toc';
import { StateShowcase } from './state-showcase';
import { TableShowcase } from './table-showcase';
import { ThemeTester } from './theme-tester';
import { TypographyShowcase } from './typography-showcase';

export default function DesignSystemPage(): ReactNode {
  return (
    <PageShell
      eyebrow="Development only"
      title="Design System"
      description="Visual reference for tokens, typography and components. Not available in production."
    >
      {/* Contents on the right on wide screens; a jump menu above on narrower ones. */}
      <div className="flex flex-col gap-8 xl:flex-row-reverse xl:items-start xl:gap-10">
        <div className="xl:sticky xl:top-4 xl:w-56 xl:shrink-0">
          <ShowcaseToc />
        </div>

        <div className="section-gap min-w-0 flex-1">
          <ShowcaseSection id="theme" title="Theme">
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
        </div>
      </div>
    </PageShell>
  );
}
