import { formatPrice } from '@/lib/format';
import { SITE } from '@/lib/site';
import type { Order } from '@prisma/client';

interface OrderConfirmationProps {
  order: Order;
}

export function OrderConfirmationEmail({ order }: OrderConfirmationProps) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '24px', color: '#333' }}>
          Order Confirmed
        </h1>
        <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
          Thank you for your purchase
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <p style={{ margin: '0 0 15px 0', color: '#333', fontSize: '16px' }}>
          Hi there,
        </p>
        <p style={{ margin: '0 0 15px 0', color: '#666', fontSize: '14px', lineHeight: '1.6' }}>
          Your payment has been received and confirmed. Your order is being prepared for shipment.
        </p>
      </div>

      {/* Order Details */}
      <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#333' }}>
          Order Details
        </h2>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '10px 0', color: '#666', fontSize: '14px' }}>
                <strong>Order Number:</strong>
              </td>
              <td style={{ padding: '10px 0', color: '#333', fontSize: '14px', textAlign: 'right' }}>
                {order.reference}
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '10px 0', color: '#666', fontSize: '14px' }}>
                <strong>Order Date:</strong>
              </td>
              <td style={{ padding: '10px 0', color: '#333', fontSize: '14px', textAlign: 'right' }}>
                {new Date(order.createdAt || Date.now()).toLocaleDateString()}
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '10px 0', color: '#666', fontSize: '14px' }}>
                <strong>Total Amount:</strong>
              </td>
              <td style={{ padding: '10px 0', color: '#333', fontSize: '14px', textAlign: 'right' }}>
                {order.total ? formatPrice(Number(order.total)) : 'N/A'}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '10px 0', color: '#666', fontSize: '14px' }}>
                <strong>Status:</strong>
              </td>
              <td style={{ padding: '10px 0', color: '#27ae60', fontSize: '14px', textAlign: 'right' }}>
                ✓ Paid
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Call to Action */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <a
          href={`${SITE.url}/account`}
          style={{
            display: 'inline-block',
            backgroundColor: '#333',
            color: '#fff',
            padding: '12px 30px',
            borderRadius: '4px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          View Order Status
        </a>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #eee', paddingTop: '20px', textAlign: 'center' }}>
        <p style={{ margin: '0 0 10px 0', color: '#666', fontSize: '12px' }}>
          If you have any questions about your order, please{' '}
          <a href={`${SITE.url}/contact`} style={{ color: '#0066cc', textDecoration: 'none' }}>
            contact us
          </a>
        </p>
        <p style={{ margin: '0', color: '#999', fontSize: '11px' }}>
          © {new Date().getFullYear()} {SITE.name}. All rights reserved.
        </p>
      </div>
    </div>
  );
}
