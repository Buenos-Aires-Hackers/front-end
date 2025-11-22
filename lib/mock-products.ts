export interface Product {
  id: number;
  title: string;
  description: string;
  price: string;
  originalPrice?: string;
  imageUrl?: string;
  badge?: string;
  rating: number;
  reviews: number;
  category: string;
  inStock: boolean;
  tags?: string[];
}

export const mockProducts: Product[] = [
  {
    id: 1,
    title: "Premium Wireless Headphones",
    description:
      "High-quality wireless headphones with active noise cancellation, premium sound quality, and 30-hour battery life. Perfect for music lovers and professionals.",
    price: "$299.99",
    originalPrice: "$399.99",
    badge: "Sale",
    rating: 4.8,
    reviews: 124,
    category: "Electronics",
    inStock: true,
    tags: ["wireless", "noise-cancellation", "premium"],
  },
  {
    id: 2,
    title: "Smart Fitness Watch",
    description:
      "Advanced fitness tracker with heart rate monitoring, GPS functionality, sleep tracking, and waterproof design for all your activities.",
    price: "$199.99",
    rating: 4.6,
    reviews: 89,
    category: "Wearables",
    inStock: true,
    tags: ["fitness", "smartwatch", "health"],
  },
  {
    id: 3,
    title: "Portable Power Bank 20000mAh",
    description:
      "High-capacity portable charger with fast charging support, multiple USB ports, and LED display showing remaining battery.",
    price: "$49.99",
    originalPrice: "$79.99",
    badge: "Best Seller",
    rating: 4.5,
    reviews: 256,
    category: "Accessories",
    inStock: true,
    tags: ["charging", "portable", "fast-charge"],
  },
  {
    id: 4,
    title: "Waterproof Bluetooth Speaker",
    description:
      "Premium Bluetooth speaker with 360-degree sound, waterproof design, and 12-hour battery life for outdoor adventures.",
    price: "$89.99",
    rating: 4.4,
    reviews: 67,
    category: "Audio",
    inStock: true,
    tags: ["bluetooth", "waterproof", "outdoor"],
  },
  {
    id: 5,
    title: "Fast Wireless Charging Pad",
    description:
      "15W fast wireless charging pad compatible with all Qi-enabled devices. Includes LED indicators and foreign object detection.",
    price: "$34.99",
    badge: "New",
    rating: 4.3,
    reviews: 43,
    category: "Accessories",
    inStock: true,
    tags: ["wireless-charging", "fast-charge", "qi"],
  },
  {
    id: 6,
    title: "USB-C Hub 7-in-1",
    description:
      "Versatile USB-C hub with 4K HDMI output, USB 3.0 ports, SD card reader, and PD charging support for laptops.",
    price: "$59.99",
    originalPrice: "$89.99",
    rating: 4.7,
    reviews: 178,
    category: "Computer Accessories",
    inStock: true,
    tags: ["usb-c", "hub", "4k-hdmi"],
  },
  {
    id: 7,
    title: "Mechanical Gaming Keyboard",
    description:
      "RGB backlit mechanical keyboard with blue switches, programmable keys, and aluminum frame for gaming enthusiasts.",
    price: "$149.99",
    originalPrice: "$199.99",
    badge: "Gaming",
    rating: 4.9,
    reviews: 312,
    category: "Gaming",
    inStock: true,
    tags: ["mechanical", "gaming", "rgb"],
  },
  {
    id: 8,
    title: "4K Webcam with Auto Focus",
    description:
      "Professional 4K webcam with auto focus, noise reduction microphone, and wide-angle lens for streaming and video calls.",
    price: "$129.99",
    rating: 4.6,
    reviews: 95,
    category: "Computer Accessories",
    inStock: false,
    tags: ["4k", "webcam", "streaming"],
  },
  {
    id: 9,
    title: "Ergonomic Office Chair",
    description:
      "Premium ergonomic office chair with lumbar support, adjustable height, and breathable mesh design for all-day comfort.",
    price: "$299.99",
    originalPrice: "$449.99",
    badge: "Sale",
    rating: 4.5,
    reviews: 87,
    category: "Furniture",
    inStock: true,
    tags: ["ergonomic", "office", "comfortable"],
  },
  {
    id: 10,
    title: "Smart Home Security Camera",
    description:
      "WiFi security camera with 1080p HD video, night vision, motion detection, and two-way audio communication.",
    price: "$79.99",
    badge: "New",
    rating: 4.4,
    reviews: 156,
    category: "Smart Home",
    inStock: true,
    tags: ["security", "wifi", "hd-video"],
  },
  {
    id: 11,
    title: "Laptop Stand Adjustable",
    description:
      "Aluminum laptop stand with adjustable height and angle, compatible with laptops 11-17 inches. Improves ergonomics and cooling.",
    price: "$39.99",
    rating: 4.2,
    reviews: 73,
    category: "Computer Accessories",
    inStock: true,
    tags: ["laptop", "adjustable", "ergonomic"],
  },
  {
    id: 12,
    title: "Wireless Mouse Precision",
    description:
      "High-precision wireless mouse with customizable DPI, ergonomic design, and long-lasting battery for productivity and gaming.",
    price: "$24.99",
    originalPrice: "$39.99",
    rating: 4.1,
    reviews: 201,
    category: "Computer Accessories",
    inStock: true,
    tags: ["wireless", "precision", "ergonomic"],
  },
];

// Helper functions for filtering and searching products
export const getProductsByCategory = (category: string): Product[] => {
  return mockProducts.filter((product) => product.category === category);
};

export const getProductsOnSale = (): Product[] => {
  return mockProducts.filter((product) => product.originalPrice);
};

export const getProductsByRating = (minRating: number): Product[] => {
  return mockProducts.filter((product) => product.rating >= minRating);
};

export const searchProducts = (query: string): Product[] => {
  const lowercaseQuery = query.toLowerCase();
  return mockProducts.filter(
    (product) =>
      product.title.toLowerCase().includes(lowercaseQuery) ||
      product.description.toLowerCase().includes(lowercaseQuery) ||
      product.tags?.some((tag) => tag.toLowerCase().includes(lowercaseQuery))
  );
};

export const getAvailableCategories = (): string[] => {
  return Array.from(new Set(mockProducts.map((product) => product.category)));
};

export const getFeaturedProducts = (): Product[] => {
  return mockProducts.filter(
    (product) => product.badge === "Best Seller" || product.rating >= 4.7
  );
};
