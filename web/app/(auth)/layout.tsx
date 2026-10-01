import { BrandWatermark } from "../../components/aorms/BrandWatermark";
import { TitleBlock } from "../../components/aorms/TitleBlock";
import { InstructionsScope } from "../../components/aorms/InstructionsScope";

/**
 * Sign-in family shell — one centred 30rem column with real padding (the old
 * Grid/Column version sat flush top-left at wide widths), the AORMS mark and the
 * floating sheet footer, so /forgot-password and /reset-password match
 * /platform-login. Pages supply their own AuthHead.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <InstructionsScope>
      <div className="aorms-auth">{children}</div>
      <TitleBlock companyName="" />
      <BrandWatermark />
    </InstructionsScope>
  );
}
