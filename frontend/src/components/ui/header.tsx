export function Header() {
  return (
    <header className="bg-dark border-bottom py-3">
      <div className="container">
        <div className="d-flex align-items-center justify-content-center">
          <div className="d-flex align-items-center gap-3">
            <div className="bg-primary rounded-3 d-flex align-items-center justify-content-center flex-shrink-0" style={{width: '40px', height: '40px'}}>
              <span className="text-white fw-bold fs-5">BM</span>
            </div>
            <h1 className="text-white mb-0 fw-bold fs-4">BloxMarket</h1>
          </div>
        </div>
      </div>
    </header>
  );
}