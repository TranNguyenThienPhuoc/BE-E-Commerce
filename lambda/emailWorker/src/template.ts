export interface EmailOrderItem {
  name: string;
  price: number;
  quantity: number;
}

export function getOrderConfirmationHtml(
  orderId: string,
  items: EmailOrderItem[],
  totalAmount: number
): string {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const itemsHtml = items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #e0e0e0;">
        <td style="padding: 12px 0; color: #333333; font-size: 14px;">
          <strong>${item.name}</strong>
          <div style="font-size: 12px; color: #666666; margin-top: 4px;">
            Số lượng: ${item.quantity}
          </div>
        </td>
        <td style="padding: 12px 0; text-align: right; color: #333333; font-size: 14px; font-weight: 600;">
          ${formatPrice(item.price * item.quantity)}
        </td>
      </tr>
    `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Xác Nhận Đơn Hàng từ Zopee</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f7f6; padding: 20px 0;">
        <tr>
          <td align="center">
            <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #ff4e2e 0%, #ff7a00 100%); padding: 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 0.5px;">ZOPEE</h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px; font-weight: 500;">Cảm ơn bạn đã mua sắm tại Zopee!</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding: 30px;">
                  <h2 style="color: #1a202c; margin: 0 0 10px 0; font-size: 20px; font-weight: 700;">Xác Nhận Đơn Hàng Thành Công 🎉</h2>
                  <p style="color: #4a5568; line-height: 1.6; margin: 0 0 25px 0; font-size: 14px;">
                    Chào quý khách, đơn hàng của quý khách đã được lưu nhận trên hệ thống của Zopee. Chúng tôi sẽ nhanh chóng xử lý và bàn giao cho đơn vị vận chuyển.
                  </p>
                  
                  <!-- Order Info -->
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 25px; border: 1px solid #edf2f7;">
                    <tr>
                      <td style="padding-bottom: 8px; color: #718096; font-size: 13px;">Mã đơn hàng:</td>
                      <td style="padding-bottom: 8px; color: #1a202c; font-size: 13px; font-weight: 700; text-align: right;">${orderId}</td>
                    </tr>
                    <tr>
                      <td style="color: #718096; font-size: 13px;">Ngày đặt hàng:</td>
                      <td style="color: #1a202c; font-size: 13px; font-weight: 500; text-align: right;">${new Date().toLocaleDateString("vi-VN")}</td>
                    </tr>
                  </table>

                  <!-- Items Table -->
                  <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 16px; font-weight: 700; border-bottom: 2px solid #edf2f7; padding-bottom: 8px;">Chi tiết sản phẩm</h3>
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 25px;">
                    ${itemsHtml}
                    <!-- Total -->
                    <tr>
                      <td style="padding: 20px 0 0 0; font-size: 16px; font-weight: 700; color: #1a202c;">Tổng cộng:</td>
                      <td style="padding: 20px 0 0 0; font-size: 20px; font-weight: 800; color: #ff4e2e; text-align: right;">
                        ${formatPrice(totalAmount)}
                      </td>
                    </tr>
                  </table>

                  <p style="color: #718096; font-size: 12px; line-height: 1.5; margin: 0; text-align: center; border-top: 1px solid #edf2f7; padding-top: 20px;">
                    Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với bộ phận hỗ trợ khách hàng của Zopee bằng cách trả lời email này.
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #edf2f7;">
                  <p style="margin: 0; color: #a0aec0; font-size: 12px;">© ${new Date().getFullYear()} Zopee Corporation. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
