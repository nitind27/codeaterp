import './globals.css'
import Toaster from '../components/Toaster'

export const metadata = {
  title: 'Codeat Infotech ERP',
  description: 'Enterprise Resource Planning System',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
