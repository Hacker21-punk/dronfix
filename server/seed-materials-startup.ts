/**
 * Auto-seed materials & service types on server startup.
 * Idempotent — uses ON CONFLICT DO UPDATE so safe to run every boot.
 */
import { db } from "./db";
import { materialsMaster, serviceTypes } from "@shared/schema";
import { log } from "./index";

interface MaterialRow {
  materialCode: string;
  hsnCode: string;
  materialDescription: string;
  gstRate: string;
  customerBasicPrice: string;
  gstAmount: string;
  customerSalePrice: string;
}

// Full Customer Price List (Jan 2026) — 70 parts
const ALL_MATERIALS: MaterialRow[] = [
  // ── Page 1 ──
  { materialCode: "17225", hsnCode: "73181500", materialDescription: "M3X6 SS AHS", gstRate: "18", customerBasicPrice: "5.76", gstAmount: "1.04", customerSalePrice: "6.79" },
  { materialCode: "17226", hsnCode: "73181600", materialDescription: "M3X8 SS AHS", gstRate: "18", customerBasicPrice: "6.38", gstAmount: "1.15", customerSalePrice: "7.53" },
  { materialCode: "17227", hsnCode: "73181600", materialDescription: "M4 Lock Nut", gstRate: "18", customerBasicPrice: "4.60", gstAmount: "0.83", customerSalePrice: "5.43" },
  { materialCode: "17228", hsnCode: "73182200", materialDescription: "M4 Plain Washer", gstRate: "18", customerBasicPrice: "0.82", gstAmount: "0.15", customerSalePrice: "0.97" },
  { materialCode: "17229", hsnCode: "73181500", materialDescription: "M4X10 SS AHS", gstRate: "18", customerBasicPrice: "7.81", gstAmount: "1.41", customerSalePrice: "9.22" },
  { materialCode: "17230", hsnCode: "73181600", materialDescription: "M4X16 SS AHS", gstRate: "18", customerBasicPrice: "5.26", gstAmount: "0.95", customerSalePrice: "6.21" },
  { materialCode: "17231", hsnCode: "73181500", materialDescription: "M4X20 SS AHS", gstRate: "18", customerBasicPrice: "7.40", gstAmount: "1.33", customerSalePrice: "8.73" },
  { materialCode: "17232", hsnCode: "73181500", materialDescription: "M4X30mm AHS", gstRate: "18", customerBasicPrice: "12.33", gstAmount: "2.22", customerSalePrice: "14.55" },
  { materialCode: "17233", hsnCode: "73181600", materialDescription: "M6X30 SS AHS", gstRate: "18", customerBasicPrice: "12.00", gstAmount: "2.16", customerSalePrice: "14.16" },
  { materialCode: "17234", hsnCode: "84663020", materialDescription: "Nylon GPS Stand", gstRate: "18", customerBasicPrice: "50.98", gstAmount: "9.18", customerSalePrice: "60.15" },
  { materialCode: "17235", hsnCode: "41151000", materialDescription: "M3 Red Fiber Washer", gstRate: "18", customerBasicPrice: "1.64", gstAmount: "0.30", customerSalePrice: "1.94" },
  { materialCode: "17236", hsnCode: "39269099", materialDescription: "Blue Spacer 13mm (Sensor)", gstRate: "18", customerBasicPrice: "9.71", gstAmount: "1.75", customerSalePrice: "11.46" },
  { materialCode: "17237", hsnCode: "39211100", materialDescription: "Propeller Holder Foam", gstRate: "18", customerBasicPrice: "85.71", gstAmount: "15.43", customerSalePrice: "101.14" },
  { materialCode: "17239", hsnCode: "82041120", materialDescription: "T- Allen key 2.5mm", gstRate: "18", customerBasicPrice: "73.67", gstAmount: "13.26", customerSalePrice: "86.93" },
  { materialCode: "17240", hsnCode: "82041120", materialDescription: "T- Allen key 3mm", gstRate: "18", customerBasicPrice: "84.03", gstAmount: "15.13", customerSalePrice: "99.15" },
  { materialCode: "17241", hsnCode: "88010090", materialDescription: "Tank Mounting Clamp PP", gstRate: "18", customerBasicPrice: "189.10", gstAmount: "34.04", customerSalePrice: "223.14" },
  { materialCode: "17242", hsnCode: "42029100", materialDescription: "Toll Kit Pouch", gstRate: "18", customerBasicPrice: "264.93", gstAmount: "47.69", customerSalePrice: "312.62" },
  { materialCode: "17244", hsnCode: "58061000", materialDescription: "Velcro Male (25*475) Female (25*100) mm", gstRate: "18", customerBasicPrice: "24.67", gstAmount: "4.44", customerSalePrice: "29.11" },
  { materialCode: "17276", hsnCode: "49111010", materialDescription: "DH-AGE10P-ROTOR CRAFT UAS Oper Manual", gstRate: "18", customerBasicPrice: "208.80", gstAmount: "37.58", customerSalePrice: "246.38" },
  { materialCode: "17277", hsnCode: "49111010", materialDescription: "DH-AGE10P-ROTOR CRAFT UAS Maint Manual", gstRate: "18", customerBasicPrice: "78.30", gstAmount: "14.09", customerSalePrice: "92.39" },
  { materialCode: "17278", hsnCode: "49111010", materialDescription: "DH-AGE10P-ROTOR CRAFT UAS Flt Manual", gstRate: "18", customerBasicPrice: "113.10", gstAmount: "20.36", customerSalePrice: "133.46" },
  { materialCode: "17279", hsnCode: "49111010", materialDescription: "DH-AGE10P-ROTOR CRAFT UAS Battery LB", gstRate: "18", customerBasicPrice: "147.90", gstAmount: "26.62", customerSalePrice: "174.52" },
  { materialCode: "17280", hsnCode: "49111010", materialDescription: "DH-AGE CRAFT UAS Maint LB", gstRate: "18", customerBasicPrice: "130.50", gstAmount: "23.49", customerSalePrice: "153.99" },
  { materialCode: "17281", hsnCode: "49111010", materialDescription: "DH-AGE CRAFT UAS Operator LB", gstRate: "18", customerBasicPrice: "147.90", gstAmount: "26.62", customerSalePrice: "174.52" },
  { materialCode: "17311", hsnCode: "39172110", materialDescription: "12mm Festo Tube", gstRate: "18", customerBasicPrice: "230.21", gstAmount: "41.44", customerSalePrice: "271.65" },
  { materialCode: "17313", hsnCode: "73182200", materialDescription: "M3 Plain Washer", gstRate: "18", customerBasicPrice: "0.41", gstAmount: "0.07", customerSalePrice: "0.49" },
  { materialCode: "17314", hsnCode: "88073000", materialDescription: "6 Port Charger Hub", gstRate: "5", customerBasicPrice: "9085.21", gstAmount: "454.26", customerSalePrice: "9539.47" },
  { materialCode: "17316", hsnCode: "90282000", materialDescription: "Water Flow Sensor", gstRate: "18", customerBasicPrice: "756.90", gstAmount: "136.24", customerSalePrice: "893.14" },
  { materialCode: "17317", hsnCode: "73182200", materialDescription: "M4*25 Star Head Screw (arm folding)", gstRate: "18", customerBasicPrice: "5.76", gstAmount: "1.04", customerSalePrice: "6.79" },
  { materialCode: "17318", hsnCode: "39239090", materialDescription: "Plastic Tool Box", gstRate: "18", customerBasicPrice: "317.91", gstAmount: "57.22", customerSalePrice: "375.14" },
  { materialCode: "17333", hsnCode: "90268090", materialDescription: "Anemometer", gstRate: "18", customerBasicPrice: "1236.33", gstAmount: "222.54", customerSalePrice: "1458.87" },
  { materialCode: "17334", hsnCode: "90278090", materialDescription: "PH Meter", gstRate: "18", customerBasicPrice: "883.09", gstAmount: "158.96", customerSalePrice: "1042.05" },
  { materialCode: "17336", hsnCode: "85366990", materialDescription: "2 Pin Plug", gstRate: "18", customerBasicPrice: "56.52", gstAmount: "10.17", customerSalePrice: "66.69" },
  { materialCode: "17398", hsnCode: "73181600", materialDescription: "M3x60 SS AHS", gstRate: "18", customerBasicPrice: "51.68", gstAmount: "9.30", customerSalePrice: "60.98" },
  { materialCode: "17399", hsnCode: "73181500", materialDescription: "M6x80 SS AHS", gstRate: "18", customerBasicPrice: "40.72", gstAmount: "7.33", customerSalePrice: "48.04" },
  // ── Page 2 ──
  { materialCode: "17400", hsnCode: "73181500", materialDescription: "M4x08 SS AHS", gstRate: "18", customerBasicPrice: "5.19", gstAmount: "0.93", customerSalePrice: "6.12" },
  { materialCode: "17401", hsnCode: "73181500", materialDescription: "M4x40 SS AHS", gstRate: "18", customerBasicPrice: "10.27", gstAmount: "1.85", customerSalePrice: "12.11" },
  { materialCode: "17403", hsnCode: "73181500", materialDescription: "M3x10 SS Pan Star Screw", gstRate: "18", customerBasicPrice: "1.57", gstAmount: "0.28", customerSalePrice: "1.85" },
  { materialCode: "17404", hsnCode: "73181500", materialDescription: "M3x20 SS AHS", gstRate: "18", customerBasicPrice: "8.58", gstAmount: "1.54", customerSalePrice: "10.12" },
  { materialCode: "17405", hsnCode: "73181500", materialDescription: "M3x8 Button Head AH Screw", gstRate: "18", customerBasicPrice: "5.22", gstAmount: "0.94", customerSalePrice: "6.16" },
  { materialCode: "17406", hsnCode: "73181500", materialDescription: "M3x08 CSK Screw", gstRate: "18", customerBasicPrice: "2.40", gstAmount: "0.43", customerSalePrice: "2.83" },
  { materialCode: "17407", hsnCode: "73181500", materialDescription: "M5x10 SS AHS", gstRate: "18", customerBasicPrice: "3.60", gstAmount: "0.65", customerSalePrice: "4.25" },
  { materialCode: "17408", hsnCode: "73181500", materialDescription: "M4x12 SS AHS", gstRate: "18", customerBasicPrice: "5.59", gstAmount: "1.01", customerSalePrice: "6.59" },
  { materialCode: "17409", hsnCode: "73181500", materialDescription: "M4x60 SS AHS", gstRate: "18", customerBasicPrice: "26.62", gstAmount: "4.79", customerSalePrice: "31.41" },
  { materialCode: "17414", hsnCode: "49111010", materialDescription: "DH-AGE10-ROTOR CRAFT UAS Maint Manual", gstRate: "18", customerBasicPrice: "348.00", gstAmount: "62.64", customerSalePrice: "410.64" },
  { materialCode: "17415", hsnCode: "49111010", materialDescription: "DH-AGE10-ROTOR CRAFT UAS Flt Manual", gstRate: "18", customerBasicPrice: "348.00", gstAmount: "62.64", customerSalePrice: "410.64" },
  { materialCode: "17416", hsnCode: "49111010", materialDescription: "DH-AGE10-ROTOR CRAFT UAS Operator LB", gstRate: "18", customerBasicPrice: "348.00", gstAmount: "62.64", customerSalePrice: "410.64" },
  { materialCode: "17433", hsnCode: "39261011", materialDescription: "3mm Spiral Sleeve White", gstRate: "18", customerBasicPrice: "13.92", gstAmount: "2.51", customerSalePrice: "16.43" },
  { materialCode: "17500", hsnCode: "39261011", materialDescription: "6mm Spiral Sleeve White", gstRate: "18", customerBasicPrice: "13.92", gstAmount: "2.51", customerSalePrice: "16.43" },
  { materialCode: "17606", hsnCode: "85389000", materialDescription: "AS150U-Male", gstRate: "18", customerBasicPrice: "609.00", gstAmount: "109.62", customerSalePrice: "718.62" },
  { materialCode: "17608", hsnCode: "85389000", materialDescription: "AS150U-Female", gstRate: "18", customerBasicPrice: "609.00", gstAmount: "109.62", customerSalePrice: "718.62" },
  { materialCode: "17625", hsnCode: "73181500", materialDescription: "M4x35 SS AHS", gstRate: "18", customerBasicPrice: "11.48", gstAmount: "2.07", customerSalePrice: "13.55" },
  { materialCode: "17627", hsnCode: "73181500", materialDescription: "M4x25 SS AHS", gstRate: "18", customerBasicPrice: "7.95", gstAmount: "1.43", customerSalePrice: "9.38" },
  { materialCode: "17630", hsnCode: "73181600", materialDescription: "M6 Nut", gstRate: "18", customerBasicPrice: "5.22", gstAmount: "0.94", customerSalePrice: "6.16" },
  { materialCode: "17634", hsnCode: "73181500", materialDescription: "M2.5x6 SS AHS", gstRate: "18", customerBasicPrice: "9.40", gstAmount: "1.69", customerSalePrice: "11.09" },
  { materialCode: "18397", hsnCode: "73181600", materialDescription: "M2.5x20 SS AHS", gstRate: "18", customerBasicPrice: "13.92", gstAmount: "2.51", customerSalePrice: "16.43" },
  { materialCode: "17635", hsnCode: "73181500", materialDescription: "M2.5x8 SS AHS", gstRate: "18", customerBasicPrice: "9.40", gstAmount: "1.69", customerSalePrice: "11.09" },
  { materialCode: "17636", hsnCode: "73181500", materialDescription: "M2.5x10 SS AHS", gstRate: "18", customerBasicPrice: "10.18", gstAmount: "1.83", customerSalePrice: "12.01" },
  { materialCode: "17637", hsnCode: "73181500", materialDescription: "M2.5x12 SS AHS", gstRate: "18", customerBasicPrice: "10.96", gstAmount: "1.97", customerSalePrice: "12.94" },
  { materialCode: "17638", hsnCode: "73181500", materialDescription: "M2.5x16 SS AHS", gstRate: "18", customerBasicPrice: "10.96", gstAmount: "1.97", customerSalePrice: "12.94" },
  { materialCode: "17707", hsnCode: "84799090", materialDescription: "DHQ4 GPS Folding Antenna", gstRate: "18", customerBasicPrice: "339.30", gstAmount: "61.07", customerSalePrice: "400.37" },
  { materialCode: "17903", hsnCode: "39269099", materialDescription: "Front closer (DH-Q4)", gstRate: "18", customerBasicPrice: "64.47", gstAmount: "11.60", customerSalePrice: "76.07" },
  { materialCode: "17936", hsnCode: "85076000", materialDescription: "4S Battery -25200 mAh (DHQ4)", gstRate: "18", customerBasicPrice: "31320.00", gstAmount: "5637.60", customerSalePrice: "36957.60" },
  { materialCode: "18037", hsnCode: "84663020", materialDescription: "Arm Lock Nut LH Thread", gstRate: "18", customerBasicPrice: "391.50", gstAmount: "70.47", customerSalePrice: "461.97" },
  { materialCode: "18038", hsnCode: "84663020", materialDescription: "Arm Holder Female LH Thread", gstRate: "18", customerBasicPrice: "582.90", gstAmount: "104.92", customerSalePrice: "687.82" },
  { materialCode: "18039", hsnCode: "84663020", materialDescription: "Arm Holder Male LH Thread", gstRate: "18", customerBasicPrice: "617.70", gstAmount: "111.19", customerSalePrice: "728.89" },
  { materialCode: "18051", hsnCode: "40169990", materialDescription: "Tank Rubber Holder", gstRate: "18", customerBasicPrice: "73.08", gstAmount: "13.15", customerSalePrice: "86.23" },
  { materialCode: "18054", hsnCode: "85369090", materialDescription: "XT90S Female to AS150U Male Connector", gstRate: "18", customerBasicPrice: "1059.71", gstAmount: "190.75", customerSalePrice: "1250.46" },
  { materialCode: "18082", hsnCode: "85369090", materialDescription: "Series Connector - AS150U Male", gstRate: "18", customerBasicPrice: "1324.64", gstAmount: "238.44", customerSalePrice: "1563.08" },
  { materialCode: "18126", hsnCode: "40169340", materialDescription: "Rectangle Open Grommet 38mmx28mm", gstRate: "18", customerBasicPrice: "42.39", gstAmount: "7.63", customerSalePrice: "50.02" },
];

const DEFAULT_SERVICE_TYPES = ["Paid", "Warranty", "Insurance"];

export async function seedMaterials() {
  try {
    // Check if already seeded — skip if materials exist
    const existing = await db.select({ id: materialsMaster.id }).from(materialsMaster).limit(1);
    if (existing.length > 0) {
      log(`Materials already seeded (${existing.length}+ rows). Skipping.`, "seed");
      return;
    }

    log(`Seeding ${ALL_MATERIALS.length} materials...`, "seed");
    for (const mat of ALL_MATERIALS) {
      await db.insert(materialsMaster).values(mat).onConflictDoUpdate({
        target: materialsMaster.materialCode,
        set: {
          hsnCode: mat.hsnCode,
          materialDescription: mat.materialDescription,
          gstRate: mat.gstRate,
          customerBasicPrice: mat.customerBasicPrice,
          gstAmount: mat.gstAmount,
          customerSalePrice: mat.customerSalePrice,
        },
      });
    }

    for (const name of DEFAULT_SERVICE_TYPES) {
      await db.insert(serviceTypes).values({ name }).onConflictDoNothing();
    }

    log(`Seeded ${ALL_MATERIALS.length} materials + ${DEFAULT_SERVICE_TYPES.length} service types.`, "seed");
  } catch (err: any) {
    // Don't crash server if seed fails — log and continue
    log(`Materials seed warning: ${err.message}`, "seed");
  }
}
