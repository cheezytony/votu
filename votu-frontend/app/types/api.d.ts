interface ApiResponse<TModel = ObjectLiteral> {
  data: TModel;
  message: string;
  success: boolean;
}

interface ApiErrorResponse<
  TKeys extends string = string,
> extends ObjectLiteral {
  message: string;
  success: false;
  errors?: Record<TKeys, string[]>;
}

interface ApiPaginatedResponse<TModel extends Model> {
  data: {
    items: TModel[];
    meta: ApiPaginatedResponseMeta;
  };
}

interface ApiPaginatedResponseMeta {
  itemsPerPage: number;
  page: number;
  nextPage: number;

  totalItems: number;
  totalPages: number;

  searchKey: string | null;
  searchQuery: string | null;
}

type ApiValidationErrorChild = {
  property: string;
  constraints: Record<string, string>;
};

type ApiValidationErrorItem = {
  field: string;
  constraints: Record<string, string> | [];
  children?: ApiValidationErrorChild[];
};

type ApiValidationErrorResponse = {
  status: false;
  message: 'validation_failed';
  data: ApiValidationErrorItem[];
};
