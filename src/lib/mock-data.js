export const mockTickets = [
  {
    id: "TKT-001",
    location: "Sitio Vilgon",
    barangay: "Tejero",
    city: "Cebu City",
    reporter: "Juan Cruz",
    urgency: "High",
    status: "Pending",
    date: "2023-10-24",
    time: "08:42 AM",
    lat: 10.3025,
    lng: 123.9080,
    category: "Overflowing Bin",
    description: "Overflowing commercial garbage bin near the Sitio Vilgon community center, causing sidewalk spillover.",
  },
  {
    id: "TKT-002",
    location: "Sitio ICM",
    barangay: "Tejero",
    city: "Cebu City",
    reporter: "Maria Santos",
    urgency: "Low",
    status: "Resolved",
    date: "2023-10-23",
    time: "02:15 PM",
    lat: 10.3032,
    lng: 123.9095,
    category: "Litter",
    description: "Small food packaging litter scattered around the Sitio ICM multi-purpose park benches.",
  },
  {
    id: "TKT-003",
    location: "Sitio Daclan",
    barangay: "Tejero",
    city: "Cebu City",
    reporter: "Pedro Reyes",
    urgency: "Critical",
    status: "In Progress",
    date: "2023-10-24",
    time: "11:20 AM",
    lat: 10.2995,
    lng: 123.9065,
    category: "Illegal Dumping",
    description: "Large illegal dumping site in Sitio Daclan blocking pedestrian sidewalk and drainage gutter.",
  },
  {
    id: "TKT-004",
    location: "Sitio Sampaguita",
    barangay: "Tejero",
    city: "Cebu City",
    reporter: "Ana Lim",
    urgency: "Medium",
    status: "Pending",
    date: "2023-10-25",
    time: "09:30 AM",
    lat: 10.3008,
    lng: 123.9078,
    category: "Uncollected Waste",
    description: "Uncollected household trash bags sitting in Sitio Sampaguita for 3 days attracting stray animals.",
  },
  {
    id: "TKT-005",
    location: "Sitio Looban",
    barangay: "Tejero",
    city: "Cebu City",
    reporter: "Carlos Gomez",
    urgency: "Medium",
    status: "Resolved",
    date: "2023-10-22",
    time: "04:10 PM",
    lat: 10.3015,
    lng: 123.9090,
    category: "Coastal Waste",
    description: "Plastic bottles and single-use plastics along the coastal walkway near Sitio Looban.",
  },
  {
    id: "TKT-006",
    location: "Sitio Bacaros",
    barangay: "Tejero",
    city: "Cebu City",
    reporter: "Elena Tan",
    urgency: "High",
    status: "In Progress",
    date: "2023-10-25",
    time: "01:45 PM",
    lat: 10.3020,
    lng: 123.9102,
    category: "Drainage Clog",
    description: "Clogged drainage channel due to heavy solid waste accumulation in Sitio Bacaros.",
  },
  {
    id: "TKT-007",
    location: "Sitio Silangan",
    barangay: "Tejero",
    city: "Cebu City",
    reporter: "Miguel Castro",
    urgency: "Low",
    status: "Pending",
    date: "2023-10-26",
    time: "07:15 AM",
    lat: 10.3045,
    lng: 123.9085,
    category: "Green Waste",
    description: "Fallen tree branches and pruning waste after maintenance in Sitio Silangan.",
  },
  {
    id: "TKT-008",
    location: "Sitio Mac Arthur",
    barangay: "Tejero",
    city: "Cebu City",
    reporter: "Rosa Diaz",
    urgency: "Critical",
    status: "Pending",
    date: "2023-10-26",
    time: "10:05 AM",
    lat: 10.3010,
    lng: 123.9060,
    category: "Hazardous Waste",
    description: "Improperly disposed commercial chemical containers near Sitio Mac Arthur service lane.",
  },
  {
    id: "TKT-009",
    location: "Sitio Vilgon",
    barangay: "Tejero",
    city: "Cebu City",
    reporter: "Luisa Perez",
    urgency: "High",
    status: "Resolved",
    date: "2023-10-21",
    time: "05:50 PM",
    lat: 10.3028,
    lng: 123.9082,
    category: "Organic Waste",
    description: "Rotten organic produce waste accumulating outside Sitio Vilgon market perimeter.",
  },
  {
    id: "TKT-010",
    location: "Sitio ICM",
    barangay: "Tejero",
    city: "Cebu City",
    reporter: "Victor Manuel",
    urgency: "Medium",
    status: "In Progress",
    date: "2023-10-25",
    time: "03:25 PM",
    lat: 10.3035,
    lng: 123.9092,
    category: "Debris",
    description: "Construction debris and gravel spillage along Sitio ICM emergency shoulder.",
  },
  {
    id: "TKT-011",
    location: "Sitio Daclan",
    barangay: "Tejero",
    city: "Cebu City",
    reporter: "Sofia Fernandez",
    urgency: "Critical",
    status: "Pending",
    date: "2023-10-26",
    time: "06:40 AM",
    lat: 10.2992,
    lng: 123.9068,
    category: "Illegal Dumping",
    description: "Massive mixed waste pile blocking vendor delivery pathway in Sitio Daclan.",
  },
  {
    id: "TKT-012",
    location: "Sitio Sampaguita",
    barangay: "Tejero",
    city: "Cebu City",
    reporter: "Rafael Garcia",
    urgency: "Low",
    status: "Resolved",
    date: "2023-10-20",
    time: "01:10 PM",
    lat: 10.3005,
    lng: 123.9075,
    category: "Litter",
    description: "Spilled liquid and cardboard cartons near Sitio Sampaguita transit zone.",
  },
];

export const mockDashboardStats = {
  totalReports: 12,
  pending: 5,
  inProgress: 3,
  resolved: 4,
  responseTime: "4.2 hrs",
  resolutionRate: "89%",
  activeTrucks: 8,
  totalTrucks: 10,
  monthlyTonnage: "1,420 t",
};

export const mockRecentActivity = [
  {
    id: "ACT-01",
    type: "status_change",
    title: "TKT-003 escalated to In Progress",
    description: "Truck 04 dispatched to Sitio Daclan, Brgy. Tejero.",
    timestamp: "12m ago",
    badge: "Dispatch",
  },
  {
    id: "ACT-02",
    type: "new_ticket",
    title: "New Incident Filed: TKT-011",
    description: "Critical illegal dumping reported in Sitio Daclan, Brgy. Tejero.",
    timestamp: "38m ago",
    badge: "Alert",
  },
  {
    id: "ACT-03",
    type: "resolved",
    title: "TKT-002 Marked Resolved",
    description: "Sanitation Team 2 completed cleanup at Sitio ICM, Brgy. Tejero.",
    timestamp: "2h ago",
    badge: "Resolved",
  },
  {
    id: "ACT-04",
    type: "fleet",
    title: "Route Optimized for Sitio Sampaguita",
    description: "AI dispatcher re-routed Truck 02 to alleviate Sitio Sampaguita backlog.",
    timestamp: "4h ago",
    badge: "System",
  },
];

export const mockAnalyticsData = {
  monthlyReports: [
    { month: "May", count: 85, resolved: 78 },
    { month: "Jun", count: 110, resolved: 102 },
    { month: "Jul", count: 95, resolved: 90 },
    { month: "Aug", count: 128, resolved: 119 },
    { month: "Sep", count: 135, resolved: 124 },
    { month: "Oct", count: 142, resolved: 126 },
  ],
  categories: [
    { name: "Illegal Dumping", count: 38, percentage: "27%" },
    { name: "Overflowing Bins", count: 42, percentage: "30%" },
    { name: "Uncollected Waste", count: 31, percentage: "22%" },
    { name: "Drainage Clogs", count: 19, percentage: "13%" },
    { name: "Green/Debris Waste", count: 12, percentage: "8%" },
  ],
  barangayRankings: [
    { name: "Guadalupe", reports: 28, resolvedRate: "92%" },
    { name: "Capitol Site", reports: 22, resolvedRate: "86%" },
    { name: "Banilad", reports: 19, resolvedRate: "95%" },
    { name: "Parian", reports: 17, resolvedRate: "76%" },
    { name: "Ermita", reports: 15, resolvedRate: "80%" },
  ],
};

export const mockPilotData = {
  barangay: "Tejero",
  city: "Cebu City",
  center: [10.3016, 123.9086], // Approx Tejero center
  zones: [
    {
      id: "zone-a",
      name: "Sitio Vilgon & Sitio Silangan",
      coordinates: [
        [10.302, 123.908],
        [10.305, 123.908],
        [10.305, 123.911],
        [10.302, 123.911]
      ]
    },
    {
      id: "zone-b",
      name: "Sitio Daclan & Sitio Mac Arthur",
      coordinates: [
        [10.299, 123.906],
        [10.302, 123.906],
        [10.302, 123.909],
        [10.299, 123.909]
      ]
    },
    {
      id: "zone-c",
      name: "Sitio ICM & Tejero Market",
      coordinates: [
        [10.300, 123.909],
        [10.303, 123.909],
        [10.303, 123.912],
        [10.300, 123.912]
      ]
    }
  ],
  trucks: [
    {
      id: "TRK-01",
      plate: "GW-8821",
      capacity: "10 Tons",
      driver: "Juan Dela Cruz"
    },
    {
      id: "TRK-02",
      plate: "XYZ-1234",
      capacity: "12 Tons",
      driver: "Pedro Reyes"
    },
    {
      id: "TRK-03",
      plate: "ABC-3345",
      capacity: "8 Tons",
      driver: null
    },
    {
      id: "TRK-04",
      plate: "DEF-7789",
      capacity: "10 Tons",
      driver: null
    }
  ],
  schedules: [
    {
      id: "SCH-001",
      zoneId: "zone-a",
      type: "Malata (Nabubulok)",
      days: ["Monday", "Wednesday", "Friday"],
      time: "08:00 AM - 11:00 AM",
      activeTruckId: "TRK-01",
      status: "Scheduled", // Could be Scheduled, In Progress, Completed
      routePoints: [
        { name: "Sitio Silangan", time: "8:00 AM", lat: 10.3024, lng: 123.9084 },
        { name: "Sitio Vilgon", time: "8:45 AM", lat: 10.3029, lng: 123.9095 },
        { name: "Tejero Chapel", time: "9:30 AM", lat: 10.3039, lng: 123.9102 },
        { name: "MRF Facility", time: "10:30 AM", lat: 10.3048, lng: 123.9108 },
      ],
    },
    {
      id: "SCH-002",
      zoneId: "zone-b",
      type: "Dili Malata (Di-Nabubulok)",
      days: ["Tuesday", "Thursday"],
      time: "01:00 PM - 04:00 PM",
      activeTruckId: "TRK-02",
      status: "Scheduled",
      routePoints: [
        { name: "Sitio Mac Arthur", time: "1:00 PM", lat: 10.2995, lng: 123.9065 },
        { name: "Sitio Daclan", time: "1:45 PM", lat: 10.3002, lng: 123.9072 },
        { name: "Sitio Sampaguita", time: "2:30 PM", lat: 10.3011, lng: 123.9081 },
        { name: "MRF Facility", time: "3:45 PM", lat: 10.3048, lng: 123.9108 },
      ],
    },
    {
      id: "SCH-003",
      zoneId: "zone-c",
      type: "Recyclable",
      days: ["Saturday"],
      time: "09:00 AM - 12:00 PM",
      activeTruckId: "TRK-01",
      status: "Scheduled",
      routePoints: [
        { name: "Tejero Market", time: "9:00 AM", lat: 10.3005, lng: 123.9095 },
        { name: "M.J. Cuenco Ave", time: "9:40 AM", lat: 10.3013, lng: 123.9102 },
        { name: "Sitio ICM", time: "10:20 AM", lat: 10.3022, lng: 123.9111 },
        { name: "MRF Facility", time: "11:30 AM", lat: 10.3048, lng: 123.9108 },
      ],
    }
  ],
  activeTracking: {
    "TRK-01": {
      lat: 10.3025,
      lng: 123.9095,
      heading: 90,
      lastUpdated: "Just now",
      eta: "5 mins",
      isActive: true,
    },
    "TRK-02": {
      lat: 10.3016,
      lng: 123.9086,
      heading: 0,
      lastUpdated: "Standby",
      eta: "Parked",
      isActive: false,
    }
  }
};

export const getTicketPhoto = (category) => {
  switch (category) {
    case "Overflowing Bin":
    case "Overflowing commercial garbage bin near the intersection causing spillover into sidewalk.":
      return "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=600&auto=format&fit=crop&q=80";
    case "Litter":
      return "https://images.unsplash.com/photo-1595278069441-2cf29f8885b5?w=600&auto=format&fit=crop&q=80";
    case "Illegal Dumping":
      return "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop&q=80";
    case "Uncollected Waste":
      return "https://images.unsplash.com/photo-1518364538800-6bcb3f25da49?w=600&auto=format&fit=crop&q=80";
    case "Coastal Waste":
      return "https://images.unsplash.com/photo-1621451537084-482c73073a0f?w=600&auto=format&fit=crop&q=80";
    case "Drainage Clog":
      return "https://images.unsplash.com/photo-1504438612444-b2d1ecaa9ad6?w=600&auto=format&fit=crop&q=80";
    case "Green Waste":
      return "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop&q=80";
    case "Hazardous Waste":
      return "https://images.unsplash.com/photo-1584263347416-85a211352859?w=600&auto=format&fit=crop&q=80";
    case "Organic Waste":
      return "https://images.unsplash.com/photo-1582281227097-99a721868841?w=600&auto=format&fit=crop&q=80";
    case "Debris":
    default:
      return "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600&auto=format&fit=crop&q=80";
  }
};
