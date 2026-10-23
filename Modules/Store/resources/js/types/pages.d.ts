interface ProductCategoriesIndexProps extends SharedData {
   categories: ProductCategory[];
}

interface BookShelves {
   new_arrivals: Product[];
   featured: Product[];
   most_viewed: Product[];
   best_sellers: Product[];
   children: Product[];
   school: Product[];
   special_offers: Product[];
}
interface ProductsIndexProps extends SharedData {
   shelves: BookShelves;
   category?: ProductCategory | null;
   products: Pagination<Product>;
   categories: ProductCategory[];
   wishlists: ProductWishlist[];
}

interface ProductDetailsProps extends SharedData {
   relatedBooks: Product[];
   product: Product;
   order: ProductOrder | null;
   wishlists: ProductWishlist[];
   reviews: Pagination<ProductReview>;
   totalReviews: ProductTotalReview;
}

interface ProductTotalReview {
   total_reviews: number;
   rating_distribution: { stars: number; percentage: number }[];
}

interface ProductDashboardIndexProps extends SharedData {
   products: Pagination<Product>;
   statuses: Product['status'][];
}

interface ProductCreateProps extends SharedData {
   categories: ProductCategory[];
   instructors?: Instructor[];
}

interface ProductUpdateProps extends SharedData {
   tab?: string;
   product: Product;
   statuses: Product['status'][];
   categories: ProductCategory[];
   approvalStatus: ProductApprovalValidation;
}

interface ProductApprovalValidation {
   approve_able: boolean;
   validation_messages: string[];
}
