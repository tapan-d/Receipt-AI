import { Suspense } from 'react';
import QueryChat from './QueryChat';

export default function QueryPage() {
  return (
    <Suspense>
      <QueryChat />
    </Suspense>
  );
}
