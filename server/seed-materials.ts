/**
 * Seed script for materials_master and service_types
 * Run with: npx tsx server/seed-materials.ts
 */
import "dotenv/config";
import { db } from "./db";
import { materialsMaster, serviceTypes } from "@shared/schema";

const materials = [
  { materialCode: "17501", hsnCode: "39174000", materialDescription: "Tank - L Connector (10Ltr)", gstRate: "18", customerBasicPrice: "96.05", gstAmount: "17.29", customerSalePrice: "113.34" },
  { materialCode: "17898", hsnCode: "39235010", materialDescription: "Tank Drain Cap (10Ltr)", gstRate: "18", customerBasicPrice: "191.40", gstAmount: "34.45", customerSalePrice: "225.85" },
  { materialCode: "17900", hsnCode: "39269091", materialDescription: "Tank - Battery (10 Ltr)", gstRate: "18", customerBasicPrice: "922.20", gstAmount: "166.00", customerSalePrice: "1088.20" },
  { materialCode: "17911", hsnCode: "85366910", materialDescription: "Tank - Locking Mechanism (10 Ltr)17900", gstRate: "18", customerBasicPrice: "332.34", gstAmount: "59.82", customerSalePrice: "392.16" },
  { materialCode: "17912", hsnCode: "85291091", materialDescription: "T12- Antenna", gstRate: "18", customerBasicPrice: "313.20", gstAmount: "56.38", customerSalePrice: "369.58" },
  { materialCode: "17913", hsnCode: "85291091", materialDescription: "T12-Receiver Model Side", gstRate: "18", customerBasicPrice: "6326.64", gstAmount: "1138.80", customerSalePrice: "7465.44" },
  { materialCode: "17916", hsnCode: "85291091", materialDescription: "MK15-Antenna", gstRate: "18", customerBasicPrice: "866.52", gstAmount: "155.97", customerSalePrice: "1022.49" },
  { materialCode: "18048", hsnCode: "85389000", materialDescription: "Quick Release (DHQ4)", gstRate: "18", customerBasicPrice: "2436.00", gstAmount: "438.48", customerSalePrice: "2874.48" },
  { materialCode: "17192", hsnCode: "85444999", materialDescription: "4mm Wire Spiral 1.5mtr", gstRate: "18", customerBasicPrice: "12.96", gstAmount: "2.33", customerSalePrice: "15.29" },
  { materialCode: "17193", hsnCode: "83011000", materialDescription: "6mm Wire Spiral 3M", gstRate: "18", customerBasicPrice: "12.96", gstAmount: "2.33", customerSalePrice: "15.29" },
  { materialCode: "17194", hsnCode: "84801000", materialDescription: "Shutoff Value 8mm", gstRate: "18", customerBasicPrice: "574.20", gstAmount: "103.36", customerSalePrice: "677.56" },
  { materialCode: "17196", hsnCode: "84663020", materialDescription: "Arm Coupling locker", gstRate: "18", customerBasicPrice: "348.30", gstAmount: "62.69", customerSalePrice: "410.99" },
  { materialCode: "17197", hsnCode: "56075010", materialDescription: "Arm Holder Belt", gstRate: "18", customerBasicPrice: "291.42", gstAmount: "52.46", customerSalePrice: "343.88" },
  { materialCode: "17198", hsnCode: "84663020", materialDescription: "ARM HOLDER F S", gstRate: "18", customerBasicPrice: "526.50", gstAmount: "94.77", customerSalePrice: "621.27" },
  { materialCode: "17199", hsnCode: "84663020", materialDescription: "ARM HOLDER M S", gstRate: "18", customerBasicPrice: "558.90", gstAmount: "100.60", customerSalePrice: "659.50" },
  { materialCode: "17200", hsnCode: "84663020", materialDescription: "T Clamp - Nylon", gstRate: "18", customerBasicPrice: "36.18", gstAmount: "6.51", customerSalePrice: "42.69" },
  { materialCode: "17201", hsnCode: "39235090", materialDescription: "Cable Tie (150) Black", gstRate: "18", customerBasicPrice: "0.97", gstAmount: "0.17", customerSalePrice: "1.15" },
  { materialCode: "17202", hsnCode: "85299090", materialDescription: "Camera Mount Sheet Metal", gstRate: "18", customerBasicPrice: "211.94", gstAmount: "38.15", customerSalePrice: "250.09" },
  { materialCode: "17204", hsnCode: "74101100", materialDescription: "Copper Foil 1 inch - 400mm (25/0.4)", gstRate: "18", customerBasicPrice: "135.72", gstAmount: "24.43", customerSalePrice: "160.15" },
  { materialCode: "17207", hsnCode: "84801000", materialDescription: "Festo Y Connector 8 X 6", gstRate: "18", customerBasicPrice: "414.38", gstAmount: "74.59", customerSalePrice: "488.97" },
  { materialCode: "17208", hsnCode: "42021990", materialDescription: "Flight Case Box (L 900XW815XH675)", gstRate: "18", customerBasicPrice: "15719.06", gstAmount: "2829.43", customerSalePrice: "18548.50" },
  { materialCode: "17209", hsnCode: "42021990", materialDescription: "Frame Landing Gear Clamp", gstRate: "18", customerBasicPrice: "230.21", gstAmount: "41.44", customerSalePrice: "271.65" },
  { materialCode: "17213", hsnCode: "84663020", materialDescription: "Landing Gear RUBBER Cushion", gstRate: "18", customerBasicPrice: "69.06", gstAmount: "12.43", customerSalePrice: "81.50" },
  { materialCode: "17214", hsnCode: "85076000", materialDescription: "Lithium ion 6S 25200Mah", gstRate: "18", customerBasicPrice: "25080.00", gstAmount: "4514.40", customerSalePrice: "29594.40" },
  { materialCode: "17215", hsnCode: "73181600", materialDescription: "M3 Lock Nut", gstRate: "18", customerBasicPrice: "3.78", gstAmount: "0.68", customerSalePrice: "4.46" },
  { materialCode: "17216", hsnCode: "74199930", materialDescription: "M3x35mm Female Brass Spacer", gstRate: "18", customerBasicPrice: "15.62", gstAmount: "2.81", customerSalePrice: "18.43" },
  { materialCode: "17217", hsnCode: "74199930", materialDescription: "M3x40mm Female Brass Spacer", gstRate: "18", customerBasicPrice: "17.27", gstAmount: "3.11", customerSalePrice: "20.37" },
  { materialCode: "17218", hsnCode: "73181500", materialDescription: "M3.2 Rivet", gstRate: "18", customerBasicPrice: "15.39", gstAmount: "2.77", customerSalePrice: "18.16" },
  { materialCode: "18224", hsnCode: "73181500", materialDescription: "M3.2x12 Pop Rivet", gstRate: "18", customerBasicPrice: "11.51", gstAmount: "2.07", customerSalePrice: "13.58" },
  { materialCode: "17219", hsnCode: "39089010", materialDescription: "M3X015 Nylon Spacer Male to Female", gstRate: "18", customerBasicPrice: "5.59", gstAmount: "1.01", customerSalePrice: "6.60" },
  { materialCode: "17220", hsnCode: "73181600", materialDescription: "M3X10 SS AHS", gstRate: "18", customerBasicPrice: "6.91", gstAmount: "1.24", customerSalePrice: "8.15" },
  { materialCode: "17221", hsnCode: "73181500", materialDescription: "M3X12 SS AHS", gstRate: "18", customerBasicPrice: "6.58", gstAmount: "1.18", customerSalePrice: "7.76" },
  { materialCode: "17222", hsnCode: "73181500", materialDescription: "M3X16 SS AHS", gstRate: "18", customerBasicPrice: "7.20", gstAmount: "1.30", customerSalePrice: "8.50" },
  { materialCode: "17223", hsnCode: "73181600", materialDescription: "M3X25 SS AHS", gstRate: "18", customerBasicPrice: "4.93", gstAmount: "0.89", customerSalePrice: "5.82" },
  { materialCode: "17224", hsnCode: "73181600", materialDescription: "M3X40 SS AHS", gstRate: "18", customerBasicPrice: "7.07", gstAmount: "1.27", customerSalePrice: "8.34" },
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
  { materialCode: "17241", hsnCode: "88010090", materialDescription: "Tank Mounting Clamp PP", gstRate: "18", customerBasicPrice: "189.10", gstAmount: "15.04", customerSalePrice: "223.14" },
  { materialCode: "17242", hsnCode: "42029100", materialDescription: "Toll Kit Pouch", gstRate: "18", customerBasicPrice: "264.93", gstAmount: "47.69", customerSalePrice: "312.62" },
  { materialCode: "17244", hsnCode: "58061000", materialDescription: "Velcro Male (25*475) Female (25*100) mm", gstRate: "18", customerBasicPrice: "24.67", gstAmount: "4.44", customerSalePrice: "29.11" },
  { materialCode: "17276", hsnCode: "49111010", materialDescription: "DH- AGE10P-ROTOR CRAFT UAS Oper Manual", gstRate: "18", customerBasicPrice: "208.80", gstAmount: "37.58", customerSalePrice: "246.38" },
  { materialCode: "17277", hsnCode: "49111010", materialDescription: "DH- AGE10P-ROTOR CRAFT UAS Maint Manual", gstRate: "18", customerBasicPrice: "78.30", gstAmount: "14.09", customerSalePrice: "92.39" },
  { materialCode: "17278", hsnCode: "49111010", materialDescription: "DH- AGE10P-ROTOR CRAFT UAS Flt Manual", gstRate: "18", customerBasicPrice: "113.10", gstAmount: "20.36", customerSalePrice: "133.46" },
  { materialCode: "17279", hsnCode: "49111010", materialDescription: "DH- AGE10P-ROTOR CRAFT UAS Battery LB", gstRate: "18", customerBasicPrice: "147.90", gstAmount: "26.62", customerSalePrice: "174.52" },
  { materialCode: "17280", hsnCode: "49111010", materialDescription: "DH- AGE10P-ROTOR CRAFT UAS Maint LB", gstRate: "18", customerBasicPrice: "130.50", gstAmount: "23.49", customerSalePrice: "153.99" },
  { materialCode: "17281", hsnCode: "49111010", materialDescription: "DH- AGE10P-ROTOR CRAFT UAS Operator LB", gstRate: "18", customerBasicPrice: "147.90", gstAmount: "26.62", customerSalePrice: "174.52" },
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
];

const defaultServiceTypes = [
  "Paid",
  "Warranty",
  "Insurance",
];

async function seed() {
  console.log("[Seed] Starting materials_master seed...");

  let count = 0;
  for (const m of materials) {
    try {
      await db.insert(materialsMaster).values(m).onConflictDoUpdate({
        target: materialsMaster.materialCode,
        set: {
          hsnCode: m.hsnCode,
          materialDescription: m.materialDescription,
          gstRate: m.gstRate,
          customerBasicPrice: m.customerBasicPrice,
          gstAmount: m.gstAmount,
          customerSalePrice: m.customerSalePrice,
          updatedAt: new Date(),
        },
      });
      count++;
    } catch (err: any) {
      console.error(`[Seed] Error inserting ${m.materialCode}: ${err.message}`);
    }
  }
  console.log(`[Seed] Inserted/updated ${count} materials.`);

  // Seed service types
  for (const name of defaultServiceTypes) {
    try {
      await db.insert(serviceTypes).values({ name }).onConflictDoNothing();
    } catch {
      // Already exists
    }
  }
  console.log(`[Seed] Service types seeded.`);

  process.exit(0);
}

seed().catch((err) => {
  console.error("[Seed] Fatal error:", err);
  process.exit(1);
});
