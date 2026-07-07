import { PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDBDocumentClient } from "@/infrastructure/database";
import { CreateCategoryInput } from "@/utils/schemas/category";
import { randomUUID } from "crypto";

const TABLE_NAME = process.env.DYNAMODB_TABLE_CATEGORIES ?? "category_table";

const sampleCategories: CreateCategoryInput[] = [
  {
    name: "Thực phẩm & Đồ uống",
    description: "Các loại thực phẩm sạch, đồ uống tự nhiên và đặc sản địa phương.",
    slug: "thuc-pham-do-uong",
  },
  {
    name: "Thời trang & Phụ kiện",
    description: "Quần áo, túi xách và phụ kiện làm từ vật liệu thân thiện với môi trường.",
    slug: "thoi-trang-phu-kien",
  },
  {
    name: "Sức khỏe & Làm đẹp",
    description: "Sản phẩm chăm sóc cá nhân, mỹ phẩm thiên nhiên và thảo dược.",
    slug: "suc-khoe-lam-dep",
  },
  {
    name: "Nhà cửa & Đời sống",
    description: "Đồ dùng gia đình, trang trí nội thất bền vững.",
    slug: "nha-cua-doi-song",
  },
  {
    name: "Văn phòng phẩm",
    description: "Sổ tay, bút và dụng cụ văn phòng làm từ giấy tái chế.",
    slug: "van-phong-pham",
  },
  {
    name: "Đồ thủ công",
    description: "Sản phẩm được làm thủ công bởi các nghệ nhân địa phương.",
    slug: "do-thu-cong",
  },
  {
    name: "Sản phẩm hữu cơ",
    description: "Các sản phẩm đạt chứng nhận hữu cơ, không hóa chất độc hại.",
    slug: "san-pham-huu-co",
  },
];

const buildCategoryItem = (base: CreateCategoryInput) => ({
  id: randomUUID(),
  name: base.name,
  description: base.description,
  slug: base.slug,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

async function seedCategories() {
  if (!TABLE_NAME) {
    throw new Error("DynamoDB table name for categories is not configured.");
  }

  // Check existing
  const existingData = await dynamoDBDocumentClient.send(
    new ScanCommand({ TableName: TABLE_NAME })
  );
  const existingSlugs = new Set((existingData.Items || []).map(item => item.slug));

  const toSeed = sampleCategories.filter(cat => !existingSlugs.has(cat.slug));

  if (toSeed.length === 0) {
    console.info("All categories already exist. Skipping seed.");
    return;
  }

  console.info(
    `Seeding ${toSeed.length} categories into table "${TABLE_NAME}"...`,
  );

  const putPromises = toSeed.map((category) => {
    const item = buildCategoryItem(category);
    return dynamoDBDocumentClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      }),
    );
  });

  await Promise.all(putPromises);
  console.info("Category seed complete.");
}

if (import.meta.main) {
  seedCategories()
    .catch((err) => {
      console.error("Failed to seed categories", err);
      throw err;
    })
    .finally(() => {
      if (typeof process !== "undefined" && process.exit) {
        process.exit(0);
      }
    });
}