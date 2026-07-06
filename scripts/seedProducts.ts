import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDBDocumentClient } from "@/infrastructure/database";
import { CreateProductInput } from "@/utils/schemas/product";
import { randomUUID } from "crypto";

const TABLE_NAME = process.env.DYNAMODB_TABLE_PRODUCTS ?? "product_table";

const sampleProducts: CreateProductInput[] = [
  {
    name: "Áo thun Eco-Friendly",
    seoTitle: "ao-thun-eco-friendly",
    description: "Áo thun làm từ 100% cotton hữu cơ, thân thiện với môi trường.",
    price: 250000,
    stock: 100,
    images: ["https://picsum.photos/400/400?random=1"],
    category: "thoi-trang-phu-kien",
    status: "active",
    variants: [],
  },
  {
    name: "Cà phê Robusta Nguyên Chất",
    seoTitle: "ca-phe-robusta-nguyen-chat",
    description: "Cà phê rang mộc, hương vị đậm đà từ Đắk Lắk.",
    price: 150000,
    stock: 50,
    images: ["https://picsum.photos/400/400?random=2"],
    category: "thuc-pham-do-uong",
    status: "active",
    variants: [],
  },
  {
    name: "Sổ tay Giấy tái chế",
    seoTitle: "so-tay-giay-tai-che",
    description: "Sổ tay bìa cứng với giấy kraft tái chế, phù hợp để ghi chú.",
    price: 55000,
    stock: 200,
    images: ["https://picsum.photos/400/400?random=3"],
    category: "van-phong-pham",
    status: "active",
    variants: [],
  },
  {
    name: "Túi Tote Vải Canvas",
    seoTitle: "tui-tote-vai-canvas",
    description: "Túi tote rộng rãi, thay thế túi nilon khi đi chợ hoặc siêu thị.",
    price: 85000,
    stock: 150,
    images: ["https://picsum.photos/400/400?random=4"],
    category: "thoi-trang-phu-kien",
    status: "active",
    variants: [],
  },
  {
    name: "Tinh dầu Xả chanh",
    seoTitle: "tinh-dau-xa-chanh",
    description: "Tinh dầu thiên nhiên nguyên chất, giúp thư giãn và đuổi muỗi.",
    price: 120000,
    stock: 80,
    images: ["https://picsum.photos/400/400?random=5"],
    category: "suc-khoe-lam-dep",
    status: "active",
    variants: [],
  }
];

const buildProductItem = (base: CreateProductInput) => ({
  id: randomUUID(),
  name: base.name,
  seoTitle: base.seoTitle,
  description: base.description,
  price: base.price,
  stock: base.stock,
  images: base.images,
  category: base.category,
  status: base.status,
  variants: base.variants,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

async function seedProducts() {
  console.info(`Seeding ${sampleProducts.length} products into table "${TABLE_NAME}"...`);
  
  let successCount = 0;
  
  for (const product of sampleProducts) {
    const item = buildProductItem(product);
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    });

    try {
      await dynamoDBDocumentClient.send(command);
      successCount++;
    } catch (error) {
      console.error(`Failed to seed product "${product.name}":`, error);
    }
  }

  console.info(`Successfully seeded ${successCount}/${sampleProducts.length} products.`);
}

if (import.meta.main) {
  seedProducts()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Product seed failed:", error);
      process.exit(1);
    });
}
