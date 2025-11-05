export function Header() {
  return (
    <header className="bg-dark border-bottom py-3">
      <div className="container">
        <div className="d-flex align-items-center justify-content-center">
          <div className="d-flex align-items-center gap-3">
            <div className="rounded-3 overflow-hidden flex-shrink-0" style={{width: '40px', height: '40px'}}>
              <img 
                src="/logo.jpg" 
                alt="BloxMarket Logo" 
                className="w-100 h-100"
                style={{objectFit: 'contain'}}
              />
            </div>
            <h1 className="text-white mb-0 fw-bold fs-4">BloxMarket</h1>
          </div>
        </div>
      </div>
    </header>
  );
}