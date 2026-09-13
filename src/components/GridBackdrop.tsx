// faint grid, dimmed around the menu texts, gone at the far edges
export default function GridBackdrop() {
  return (
    <div
      className="absolute inset-0 grid-bg pointer-events-none"
      style={{
        maskImage:
          'radial-gradient(ellipse at center, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.2) 22%, black 65%)',
        WebkitMaskImage:
          'radial-gradient(ellipse at center, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.2) 22%, black 65%)',
      }}
    />
  )
}
