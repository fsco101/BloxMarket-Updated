import { Heart, Github, Twitter, MessageCircle } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-dark text-light py-4 mt-auto border-top">
      <div className="container">
        <div className="row g-4">
          {/* Brand */}
          <div className="col-lg-6 col-md-12">
            <div className="d-flex align-items-start gap-3 mb-3">
              <div className="bg-primary rounded-3 d-flex align-items-center justify-content-center flex-shrink-0" style={{width: '40px', height: '40px'}}>
                <span className="text-white fw-bold fs-5">BM</span>
              </div>
              <div>
                <h5 className="text-white mb-1 fw-bold">BloxMarket</h5>
                <small className="text-muted">Roblox Trading Community</small>
              </div>
            </div>
            <p className="text-secondary small mb-0">
              Secure Roblox item trading platform with verified users.
            </p>
          </div>

          {/* Platform */}
          <div className="col-lg-3 col-md-6">
            <h6 className="text-white fw-semibold mb-3">Platform</h6>
            <ul className="list-unstyled">
              <li className="mb-2">
                <a href="/trades" className="text-secondary text-decoration-none small hover:text-white transition-colors">
                  Trading Hub
                </a>
              </li>
              <li className="mb-2">
                <a href="/forum" className="text-secondary text-decoration-none small hover:text-white transition-colors">
                  Forums
                </a>
              </li>
              <li className="mb-2">
                <a href="/events" className="text-secondary text-decoration-none small hover:text-white transition-colors">
                  Events
                </a>
              </li>
              <li className="mb-2">
                <a href="/support" className="text-secondary text-decoration-none small hover:text-white transition-colors">
                  Support
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="col-lg-3 col-md-6">
            <h6 className="text-white fw-semibold mb-3">Legal</h6>
            <ul className="list-unstyled">
              <li className="mb-2">
                <a href="/terms" className="text-secondary text-decoration-none small hover:text-white transition-colors">
                  Terms of Service
                </a>
              </li>
              <li className="mb-2">
                <a href="/privacy" className="text-secondary text-decoration-none small hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li className="mb-2">
                <a href="/guidelines" className="text-secondary text-decoration-none small hover:text-white transition-colors">
                  Trading Guidelines
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <hr className="my-4" />
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3">
          <div className="d-flex align-items-center gap-2 text-secondary small text-center text-sm-start">
            <span>© {currentYear} BloxMarket. Made with</span>
            <Heart className="text-danger flex-shrink-0" size={16} />
            <span>for Roblox players.</span>
          </div>

          {/* Social Links */}
          <div className="d-flex align-items-center gap-3">
            <a href="#discord" className="text-secondary text-decoration-none p-2 rounded-2 hover-bg-light transition-colors" aria-label="Discord">
              <MessageCircle size={20} />
            </a>
            <a href="#twitter" className="text-secondary text-decoration-none p-2 rounded-2 hover-bg-light transition-colors" aria-label="Twitter">
              <Twitter size={20} />
            </a>
            <a href="#github" className="text-secondary text-decoration-none p-2 rounded-2 hover-bg-light transition-colors" aria-label="GitHub">
              <Github size={20} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}