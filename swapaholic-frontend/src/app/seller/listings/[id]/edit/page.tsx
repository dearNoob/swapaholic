'use client';

import { useParams } from 'next/navigation';
import { CreateListing } from '../../../../../features/seller/CreateListing';

export default function EditListingPage() {
    const params = useParams();
    const id = params.id as string;

    return <CreateListing listingId={id} />;
}
