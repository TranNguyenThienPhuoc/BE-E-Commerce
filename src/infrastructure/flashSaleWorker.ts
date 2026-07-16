import { IProductRepository } from "@/domain/repositories/IProductRepository";

/**
 * Worker tự động tắt Flash Sale cho các sản phẩm đã hết hạn.
 * Chạy định kỳ mỗi 5 phút.
 */
export function initializeFlashSaleWorker(productRepository: IProductRepository) {
  const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 phút

  const expireFlashSales = async () => {
    try {
      const now = new Date();

      // Lấy tất cả sản phẩm đang Flash Sale
      const flashSaleProducts = await productRepository.list({ isFlashSale: true });

      const expiredProducts = flashSaleProducts.filter((product) => {
        if (!product.isFlashSale) return false;
        if (!product.flashSaleEndDate) return false; // Không có ngày hết hạn → bỏ qua
        return new Date(product.flashSaleEndDate) <= now;
      });

      if (expiredProducts.length === 0) {
        return; // Không có gì cần cập nhật
      }

      console.log(`[FlashSaleWorker] Found ${expiredProducts.length} expired flash sale product(s). Disabling...`);

      // Cập nhật từng sản phẩm hết hạn
      for (const product of expiredProducts) {
        try {
          await productRepository.save({
            ...product,
            isFlashSale: false,
            flashSalePrice: null,
            flashSaleEndDate: null,
          });
          console.log(`[FlashSaleWorker] Disabled flash sale for product: ${product.id} (${product.name})`);
        } catch (err) {
          console.error(`[FlashSaleWorker] Failed to update product ${product.id}:`, err);
        }
      }
    } catch (error) {
      console.error("[FlashSaleWorker] Error checking expired flash sales:", error);
    }

    // Lập lịch lần chạy tiếp theo
    setTimeout(expireFlashSales, CHECK_INTERVAL_MS);
  };

  // Chạy lần đầu sau 30 giây để server khởi động xong
  setTimeout(expireFlashSales, 30_000);
  console.log("[FlashSaleWorker] Initialized. Will check every 5 minutes for expired flash sales.");
}
