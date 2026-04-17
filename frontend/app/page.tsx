import { redirect } from 'next/navigation';

// localhost:3000 root → redirect to the homepage on 3001
export default function RootPage() {
  redirect('http://localhost:3001');
}
