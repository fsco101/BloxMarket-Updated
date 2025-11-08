export function Header() {
  return (
    <header className="bg-dark border-bottom py-3">
      <div className="container">
        <div className="d-flex align-items-center justify-content-center">
          <div className="d-flex align-items-center gap-3">
            <div className="rounded-3 overflow-hidden flex-shrink-0" style={{width: '250px', height: '50px'}}>
              <img 
                src="/NEWLOGO1.gif" 
                alt="BloxMarket Logo" 
                className="w-100 h-100"
                style={{objectFit: 'contain'}}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}