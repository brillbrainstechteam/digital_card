import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <img src="/bb-logo.png" alt="Brill Brains" className="site-footer-logo" />
          <strong>Brill Brains</strong>
          <p>Your brand identity platform — digital cards, business cards, and branded QR codes in one place.</p>
        </div>
        <div className="site-footer-links">
          <div>
            <h4>Products</h4>
            <ul>
              <li>Digital Cards</li>
              <li>Business Cards</li>
              <li>QR Studio</li>
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li><a href="https://brillbrainsconsultants.com" target="_blank" rel="noreferrer">About</a></li>
              <li><Link to="/contact">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4>Legal</h4>
            <ul>
              <li><Link to="/terms-of-service">Terms of Service</Link></li>
              <li><Link to="/privacy-policy">Privacy Policy</Link></li>
              <li><Link to="/refund-policy">Refund &amp; Cancellation</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="site-footer-bottom">
        <span>&copy; {new Date().getFullYear()} Brill Brains Consultants. All rights reserved.</span>
      </div>
    </footer>
  )
}
