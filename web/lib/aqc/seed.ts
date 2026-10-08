/**
 * Portal → AQC import (D5): turns AORMS records into the `project` and `parties` blocks of an AQC `.bbsproj`
 * (field names are ProjectInfo.ToJson / Party.ToJson in AQC), so opening an online project fills the title block,
 * letterhead and parties without retyping. Pure; the route supplies the rows.
 */
export type SeedProject = { id: string; ref: string; title: string; city: string | null; site_address: string | null; contact_email: string | null; contact_phone: string | null };
export type SeedFirm = { company_name: string | null; architect_name: string | null; gstin: string | null; pan: string | null; email: string | null; phone: string | null; address_line1: string | null; address_line2: string | null; city: string | null; pincode: string | null; state: string | null };
export type SeedClient = { name: string | null; contact_person: string | null; email: string | null; phone: string | null } | null;
export type SeedContractor = { name: string | null; company_name: string | null; contact_person: string | null; gstin: string | null; pan: string | null; email: string | null; phone: string | null; city: string | null } | null;

const join = (...parts: (string | null | undefined)[]) => parts.map((p) => (p ?? "").trim()).filter(Boolean).join(", ");

export function buildAqcSeed(project: SeedProject, firm: SeedFirm, client: SeedClient, contractor: SeedContractor) {
  const firmAddress = join(firm.address_line1, firm.address_line2, firm.city, firm.state, firm.pincode);
  return {
    project: {
      name: project.title,
      location: join(project.site_address, project.city) || (project.city ?? ""),
      client_name: client?.name ?? "",
      prepared_by_role: "Architect",
      prepared_by_name: firm.architect_name ?? "",
      company_name: firm.company_name ?? "",
      contact_phone: firm.phone ?? "",
      contact_email: firm.email ?? "",
      address: firmAddress,
      gstin: firm.gstin ?? "",
      cin: "",
      pan: firm.pan ?? "",
      logo_path: "",
      hub_project_id: project.id,
    },
    parties: {
      active: "pm",
      pm: { role: "pm", company: firm.company_name ?? "", signatory_name: firm.architect_name ?? "", signatory_role: "Project Manager", address: firmAddress, phone: firm.phone ?? "", email: firm.email ?? "", gstin: firm.gstin ?? "", pan: firm.pan ?? "", number_prefix: "", logo_path: "" },
      contractor: {
        role: "contractor", company: contractor?.company_name || contractor?.name || "", signatory_name: contractor?.contact_person ?? "", signatory_role: "Contractor",
        address: contractor?.city ?? "", phone: contractor?.phone ?? "", email: contractor?.email ?? "", gstin: contractor?.gstin ?? "", pan: contractor?.pan ?? "", number_prefix: "", logo_path: "",
      },
    },
  };
}
