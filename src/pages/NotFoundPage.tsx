import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="page">
      <div className="container">
        <h1 className="title">Not found</h1>
        <p>The page you’re looking for doesn’t exist.</p>
        <p>
          <Link to="/">Go back home</Link>
        </p>
      </div>
    </main>
  )
}
