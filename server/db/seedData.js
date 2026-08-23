import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const initialSeedData = {
  settings: {
    homeName: "Hogar Inteligente",
    currency: "EUR",
    currencySymbol: "€",
    theme: "dark",
    alertDaysCritical: 30,
    alertDaysWarning: 90
  },
  meals: {
    days: [
      { id: "lunes", label: "Lunes", breakfast: "Tostadas con Aguacate y Café", lunch: "Salmón al Horno con Verduras Asadas", dinner: "Crema de Calabacín y Tortilla Francesa" },
      { id: "martes", label: "Martes", breakfast: "Yogur Griego con Nueces y Frutos Rojos", lunch: "Lentejas Estofadas con Verduras", dinner: "Ensalada César con Pollo a la Plancha" },
      { id: "miercoles", label: "Miércoles", breakfast: "Porridge de Avena y Plátano", lunch: "Pasta Integral con Pesto Casero y Tomates Cherry", dinner: "Merluza al Vapor con Patatas y Judías Verdes" },
      { id: "jueves", label: "Jueves", breakfast: "Tostada de Centeno con Tomate y Jamón Ibérico", lunch: "Arroz con Pollo de Corral y Pimientos", dinner: "Sopa de Verduras y Wrap de Pavo con Queso" },
      { id: "viernes", label: "Viernes", breakfast: "Batido de Proteína y Espinacas con Tostada", lunch: "Hamburguesa Casera de Ternera con Boniato", dinner: "Pizza Casera con Rúcula y Parmesano" },
      { id: "sabado", label: "Sábado", breakfast: "Pancakes de Avena con Miel y Café", lunch: "Paella de Marisco Familiar", dinner: "Tacos de Pollo con Guacamole y Pico de Gallo" },
      { id: "domingo", label: "Domingo", breakfast: "Huevos Revueltos con Champiñones", lunch: "Asado de Pollo con Patatas al Romero", dinner: "Sándwich Mixto Gourmet y Fruta Fresca" }
    ],
    recipes: [
      {
        id: "rec-1",
        name: "Salmón al Horno con Verduras Asadas",
        category: "Pescado",
        timeMinutes: 25,
        ingredients: [
          { name: "Lomos de Salmón", amount: "2", unit: "piezas", zone: "nevera" },
          { name: "Calabacín", amount: "1", unit: "ud", zone: "nevera" },
          { name: "Pimiento Rojo", amount: "1", unit: "ud", zone: "nevera" },
          { name: "Aceite de Oliva Virgen Extra", amount: "20", unit: "ml", zone: "despensa" }
        ]
      },
      {
        id: "rec-2",
        name: "Lentejas Estofadas con Verduras",
        category: "Legumbres",
        timeMinutes: 40,
        ingredients: [
          { name: "Lentejas Pardinas", amount: "300", unit: "g", zone: "despensa" },
          { name: "Zanahorias", amount: "2", unit: "ud", zone: "nevera" },
          { name: "Cebolla", amount: "1", unit: "ud", zone: "despensa" },
          { name: "Pimentón Dulce de la Vera", amount: "5", unit: "g", zone: "despensa" },
          { name: "Laurel", amount: "2", unit: "hojas", zone: "despensa" }
        ]
      },
      {
        id: "rec-3",
        name: "Pasta Integral al Pesto Casero",
        category: "Pasta",
        timeMinutes: 15,
        ingredients: [
          { name: "Pasta Integral Penne", amount: "250", unit: "g", zone: "despensa" },
          { name: "Albahaca Fresca", amount: "1", unit: "manojo", zone: "nevera" },
          { name: "Piñones", amount: "30", unit: "g", zone: "despensa" },
          { name: "Queso Parmesano Reggiano", amount: "60", unit: "g", zone: "nevera" },
          { name: "Ajo", amount: "1", unit: "diente", zone: "despensa" }
        ]
      },
      {
        id: "rec-4",
        name: "Crema de Calabacín y Tortilla Francesa",
        category: "Ligero",
        timeMinutes: 20,
        ingredients: [
          { name: "Calabacín", amount: "2", unit: "ud", zone: "nevera" },
          { name: "Huevos Camperos", amount: "3", unit: "ud", zone: "nevera" },
          { name: "Quesitos en Porciones", amount: "2", unit: "ud", zone: "nevera" }
        ]
      },
      {
        id: "rec-5",
        name: "Ensalada César con Pollo a la Plancha",
        category: "Ensalada",
        timeMinutes: 15,
        ingredients: [
          { name: "Pechuga de Pollo", amount: "300", unit: "g", zone: "nevera" },
          { name: "Lechuga Romana", amount: "1", unit: "ud", zone: "nevera" },
          { name: "Picatostes de Pan", amount: "50", unit: "g", zone: "despensa" },
          { name: "Salsa César", amount: "40", unit: "ml", zone: "nevera" }
        ]
      }
    ]
  },
  pantry: [
    { id: "pan-1", name: "Leche Entera", zone: "nevera", quantity: 3, unit: "litros", minQuantity: 2, category: "Lácteos", expiration: "2026-08-30" },
    { id: "pan-2", name: "Huevos Camperos", zone: "nevera", quantity: 6, unit: "ud", minQuantity: 6, category: "Huevos", expiration: "2026-09-05" },
    { id: "pan-3", name: "Lomos de Salmón", zone: "congelador", quantity: 0, unit: "piezas", minQuantity: 2, category: "Pescados", expiration: "2026-11-20" },
    { id: "pan-4", name: "Pechuga de Pollo", zone: "nevera", quantity: 1, unit: "bandeja", minQuantity: 1, category: "Carnes", expiration: "2026-08-27" },
    { id: "pan-5", name: "Lentejas Pardinas", zone: "despensa", quantity: 500, unit: "g", minQuantity: 500, category: "Legumbres", expiration: "2027-02-15" },
    { id: "pan-6", name: "Aceite de Oliva Virgen Extra", zone: "despensa", quantity: 2, unit: "botellas", minQuantity: 1, category: "Aceites", expiration: "2027-05-10" },
    { id: "pan-7", name: "Calabacín", zone: "nevera", quantity: 0, unit: "ud", minQuantity: 2, category: "Verduras", expiration: "2026-08-28" },
    { id: "pan-8", name: "Yogur Griego Natural", zone: "nevera", quantity: 4, unit: "ud", minQuantity: 4, category: "Lácteos", expiration: "2026-09-02" },
    { id: "pan-9", name: "Pasta Integral Penne", zone: "despensa", quantity: 1, unit: "paquete (500g)", minQuantity: 1, category: "Pastas", expiration: "2027-04-10" },
    { id: "pan-10", name: "Café en Grano Arábica", zone: "despensa", quantity: 1, unit: "paquete (1kg)", minQuantity: 1, category: "Desayuno", expiration: "2027-01-20" },
    { id: "pan-11", name: "Guisantes Congelados", zone: "congelador", quantity: 2, unit: "bolsas (400g)", minQuantity: 1, category: "Verduras", expiration: "2027-03-15" },
    { id: "pan-12", name: "Pan de Molde Integral", zone: "despensa", quantity: 0, unit: "ud", minQuantity: 1, category: "Panadería", expiration: "2026-08-29" }
  ],
  shoppingList: [
    { id: "shop-1", name: "Lomos de Salmón", category: "Pescados", quantity: "2 piezas", checked: false, fromMealPlan: true, notes: "Para el menú del lunes" },
    { id: "shop-2", name: "Calabacín", category: "Verduras", quantity: "2 ud", checked: false, fromMealPlan: true, notes: "Sin existencias en nevera" },
    { id: "shop-3", name: "Pan de Molde Integral", category: "Panadería", quantity: "1 paquete", checked: true, fromMealPlan: false, notes: "100% integral con semillas" },
    { id: "shop-4", name: "Queso Parmesano Reggiano", category: "Lácteos", quantity: "1 cuña (200g)", checked: false, fromMealPlan: true, notes: "Para pasta al pesto" }
  ],
  finance: {
    transactions: [
      { id: "fin-1", title: "Nómina Principal", amount: 2650.00, type: "ingreso", category: "Sueldo", frequency: "mensual", dayOfMonth: 28, active: true },
      { id: "fin-2", title: "Ingreso Extra / Consultoría", amount: 450.00, type: "ingreso", category: "Freelance", frequency: "mensual", dayOfMonth: 15, active: true },
      { id: "fin-3", title: "Hipoteca / Alquiler", amount: 890.00, type: "gasto", category: "Vivienda", frequency: "mensual", dayOfMonth: 1, active: true },
      { id: "fin-4", title: "Comunidad de Propietarios", amount: 75.00, type: "gasto", category: "Vivienda", frequency: "mensual", dayOfMonth: 5, active: true },
      { id: "fin-5", title: "Suministro Luz (Endesa / Iberdrola)", amount: 85.00, type: "gasto", category: "Suministros", frequency: "mensual", dayOfMonth: 10, active: true },
      { id: "fin-6", title: "Fibra Óptica y Móviles", amount: 52.00, type: "gasto", category: "Comunicaciones", frequency: "mensual", dayOfMonth: 8, active: true },
      { id: "fin-7", title: "Seguro de Hogar Mapfre", amount: 240.00, type: "gasto", category: "Seguros", frequency: "anual", dayOfMonth: 15, monthOfYear: 9, active: true },
      { id: "fin-8", title: "Seguro Coche Todo Riesgo", amount: 420.00, type: "gasto", category: "Vehículo", frequency: "anual", dayOfMonth: 20, monthOfYear: 10, active: true },
      { id: "fin-9", title: "Suscripciones (Netflix, Spotify, Prime)", amount: 35.00, type: "gasto", category: "Ocio", frequency: "mensual", dayOfMonth: 3, active: true },
      { id: "fin-10", title: "Supermercado y Alimentación", amount: 480.00, type: "gasto", category: "Alimentación", frequency: "mensual", dayOfMonth: 1, active: true },
      { id: "fin-11", title: "IBI Impuesto Bienes Inmuebles", amount: 310.00, type: "gasto", category: "Impuestos", frequency: "semestral", dayOfMonth: 12, active: true }
    ],
    overrides: [
      {
        id: "ovr-1",
        transactionId: "fin-5",
        month: "2026-08",
        amount: 112.50,
        title: "Suministro Luz (Aire Acondicionado Verano)",
        paid: true,
        category: "Suministros",
        notes: "Mayor consumo por ola de calor"
      }
    ],
    payments: {
      "2026-08": {
        "fin-1": { paid: true, date: "2026-08-28" },
        "fin-2": { paid: true, date: "2026-08-15" },
        "fin-3": { paid: true, date: "2026-08-01" },
        "fin-4": { paid: true, date: "2026-08-05" },
        "fin-5": { paid: true, date: "2026-08-10" },
        "fin-6": { paid: true, date: "2026-08-08" },
        "fin-9": { paid: true, date: "2026-08-03" },
        "fin-10": { paid: false, date: null }
      }
    }
  },
  domotics: {
    connectors: {
      ewelink: {
        configured: true,
        mode: "simulated", // 'live' | 'simulated'
        appId: "ewelink_app_live_894",
        appSecret: "••••••••••••••••",
        region: "eu",
        email: "usuario.hogar@ejemplo.com",
        lastSync: "2026-08-23T19:30:00.000Z",
        connectedDevicesCount: 8
      },
      homeAssistant: {
        configured: true,
        mode: "simulated",
        baseUrl: "http://homeassistant.local:8123",
        token: "••••••••••••••••",
        webhookUrl: "https://hook.eu.home-assistant.io/domotica-smart",
        lastSync: "2026-08-23T20:15:00.000Z"
      }
    },
    rooms: [
      { id: "salon", name: "Salón Principal", icon: "Sofa", color: "from-amber-500/20 to-orange-500/20", borderColor: "border-amber-500/30" },
      { id: "cocina", name: "Cocina & Comedor", icon: "Utensils", color: "from-emerald-500/20 to-teal-500/20", borderColor: "border-emerald-500/30" },
      { id: "dormitorio", name: "Dormitorio Principal", icon: "Bed", color: "from-indigo-500/20 to-purple-500/20", borderColor: "border-indigo-500/30" },
      { id: "bano", name: "Baño Principal", icon: "Bath", color: "from-cyan-500/20 to-blue-500/20", borderColor: "border-cyan-500/30" },
      { id: "terraza", name: "Terraza & Jardín", icon: "Sun", color: "from-lime-500/20 to-green-500/20", borderColor: "border-lime-500/30" }
    ],
    devices: [
      { id: "dev-1", name: "Luz Ambiental Salón", roomId: "salon", type: "light", state: true, brightness: 85, colorTemp: 2700, powerWatts: 18, connector: "ewelink", model: "Sonoff D1 Smart Dimmer" },
      { id: "dev-2", name: "Persiana Ventanal", roomId: "salon", type: "blind", state: true, position: 100, connector: "ewelink", model: "Sonoff DualR3 Shutter" },
      { id: "dev-3", name: "Aire Acondicionado Inverter", roomId: "salon", type: "climate", state: true, targetTemp: 23, currentTemp: 24.2, mode: "cool", powerWatts: 850, connector: "homeassistant" },
      { id: "dev-4", name: "Iluminación Encimera LED", roomId: "cocina", type: "light", state: true, brightness: 100, colorTemp: 4000, powerWatts: 24, connector: "ewelink", model: "Sonoff L3 Pro RGBIC" },
      { id: "dev-5", name: "Enchufe Cafetera Inteligente", roomId: "cocina", type: "plug", state: false, powerWatts: 0, connector: "ewelink", model: "Sonoff S26R2 Smart Plug" },
      { id: "dev-6", name: "Luz Techo Regulable", roomId: "dormitorio", type: "light", state: false, brightness: 40, colorTemp: 2500, powerWatts: 0, connector: "ewelink", model: "Sonoff B05-BL Smart Bulb" },
      { id: "dev-7", name: "Persiana Dormitorio", roomId: "dormitorio", type: "blind", state: false, position: 20, connector: "ewelink", model: "Sonoff DualR3 Shutter" },
      { id: "dev-8", name: "Calefactor Toallero", roomId: "bano", type: "switch", state: false, powerWatts: 0, connector: "ewelink", model: "Sonoff Mini R4 Smart Switch" },
      { id: "dev-9", name: "Focos Guirnalda Terraza", roomId: "terraza", type: "light", state: true, brightness: 70, powerWatts: 35, connector: "ewelink", model: "Sonoff Smart Switch Out" }
    ],
    scenes: [
      { id: "sc-1", name: "Cine / Relax", icon: "Film", description: "Luces al 20%, persianas bajadas", active: false },
      { id: "sc-2", name: "Buenos Días", icon: "Sunrise", description: "Abre persianas y enciende café", active: true },
      { id: "sc-3", name: "Salir de Casa", icon: "Shield", description: "Apaga todo y activa sensores", active: false },
      { id: "sc-4", name: "Modo Noche", icon: "Moon", description: "Iluminación tenue y climatización nocturna", active: false }
    ]
  },
  documents: [
    {
      id: "doc-1",
      title: "Frigorífico Combi No-Frost LG",
      category: "Electrodomésticos",
      issuer: "LG Electronics / MediaMarkt",
      modelOrPolicy: "GBP62MCNAC",
      purchaseDate: "2024-09-15",
      warrantyExpiryDate: "2027-09-15",
      notes: "Garantía de 3 años oficial + 10 años en el compresor Linear Inverter.",
      fileUrl: "/sample-docs/garantia-frigorifico.pdf",
      fileName: "garantia_lg_frigorifico.pdf",
      fileType: "application/pdf",
      fileSize: "1.8 MB",
      tags: ["Nevera", "Garantía", "Cocina"]
    },
    {
      id: "doc-2",
      title: "Póliza Seguro Multirriesgo Hogar",
      category: "Seguros",
      issuer: "Mapfre Seguros",
      modelOrPolicy: "POL-HOG-9928172",
      purchaseDate: "2025-09-10",
      warrantyExpiryDate: "2026-09-10", // < 30 days away! Critical alert!
      notes: "Cobertura completa daños por agua, robo y responsabilidad civil hasta 300.000€.",
      fileUrl: "/sample-docs/poliza-hogar-mapfre.pdf",
      fileName: "poliza_seguro_hogar_2026.pdf",
      fileType: "application/pdf",
      fileSize: "2.4 MB",
      tags: ["Seguro", "Vivienda", "Urgente"]
    },
    {
      id: "doc-3",
      title: "Lavadora Secadora Bosch Serie 6",
      category: "Electrodomésticos",
      issuer: "Bosch Electrodomésticos / El Corte Inglés",
      modelOrPolicy: "WDU28560ES",
      purchaseDate: "2023-11-20",
      warrantyExpiryDate: "2026-11-20", // < 90 days away! Warning alert!
      notes: "Garantía legal vence en noviembre 2026. Revisar filtro antes de vencimiento.",
      fileUrl: "/sample-docs/factura-lavadora-bosch.pdf",
      fileName: "factura_garantia_bosch_lavadora.pdf",
      fileType: "application/pdf",
      fileSize: "1.1 MB",
      tags: ["Lavadora", "Garantía", "Baño"]
    },
    {
      id: "doc-4",
      title: "Seguro de Coche Todo Riesgo",
      category: "Vehículos",
      issuer: "Línea Directa Aseguradora",
      modelOrPolicy: "POL-VEH-4482190",
      purchaseDate: "2025-10-25",
      warrantyExpiryDate: "2026-10-25", // Warning alert
      notes: "Vehículo Peugeot 3008 GT Line. Incluye vehículo de sustitución y asistencia en viaje km 0.",
      fileUrl: "/sample-docs/poliza-auto.pdf",
      fileName: "poliza_coche_linea_directa.pdf",
      fileType: "application/pdf",
      fileSize: "3.2 MB",
      tags: ["Coche", "Seguros", "Vehículo"]
    },
    {
      id: "doc-5",
      title: "Contrato Suministro Eléctrico Tarifa Regulada",
      category: "Contratos/Suministros",
      issuer: "Curenergía (Iberdrola)",
      modelOrPolicy: "CUPS-ES0021000001293847LK",
      purchaseDate: "2025-01-01",
      warrantyExpiryDate: "2027-01-01",
      notes: "Potencia contratada: 4.6 kW valle / 4.6 kW punta.",
      fileUrl: "/sample-docs/contrato-luz.pdf",
      fileName: "contrato_suministro_luz.pdf",
      fileType: "application/pdf",
      fileSize: "850 KB",
      tags: ["Luz", "Suministro", "Contrato"]
    },
    {
      id: "doc-6",
      title: "Televisor OLED 65 Pulgadas Sony Bravia",
      category: "Garantías",
      issuer: "Sony España / Amazon",
      modelOrPolicy: "XR-65A80L",
      purchaseDate: "2025-06-18",
      warrantyExpiryDate: "2028-06-18",
      notes: "3 años de garantía oficial del fabricante.",
      fileUrl: "/sample-docs/garantia-tv-sony.pdf",
      fileName: "garantia_sony_oled.pdf",
      fileType: "application/pdf",
      fileSize: "1.4 MB",
      tags: ["TV", "Salón", "Electrónica"]
    }
  ]
};
