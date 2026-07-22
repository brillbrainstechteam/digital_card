// Cart summary — reads straight from the shared CartContext, so anything
// removed here (or from the navbar cart icon) stays in sync everywhere. No
// real pricing/payment wiring yet (per scope, the payment gateway is a
// future integration), so item prices and the total are intentionally shown
// as a placeholder "X" the business can fill in later.
export function CartStep({ items, total, onRemove, onCheckout, onContinueEditing }) {
  return (
    <div className="publish-flow-cart-step">
      <h2>Your cart</h2>
      <p>Everything below is ready to go — review and check out whenever you're ready.</p>
      {items.length === 0 ? (
        <p className="cart-empty-note">Your cart is empty.</p>
      ) : (
        <ul className="cart-item-list">
          {items.map((item) => (
            <li key={item.id} className="cart-item">
              <div className="cart-item-info">
                <span className="cart-item-name">{item.name}</span>
                <span className="cart-item-desc">{item.description}</span>
              </div>
              <div className="cart-item-side">
                <span className="cart-item-price">{item.price}</span>
                <button type="button" className="cart-item-remove" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.name}`}>
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="cart-total-row">
        <span>Total</span>
        <span className="cart-total-amount">{total}</span>
      </div>
      <div className="publish-flow-actions">
        <button type="button" className="secondary-button" onClick={onContinueEditing}>Continue editing</button>
        <button type="button" className="primary-button" onClick={onCheckout}>Checkout</button>
      </div>
    </div>
  )
}
