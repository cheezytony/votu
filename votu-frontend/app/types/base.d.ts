type ObjectLiteral = Record<string, unknown>;

type Model<
  Properties extends ObjectLiteral = ObjectLiteral,
  TId extends string | number = string,
> = {
  id: TId;
} & Properties;

type ModelWithTimestamps<
  Properties extends ObjectLiteral,
  TId extends string | number = string,
> = Model<
  Properties & {
    createdAt: string;
    updatedAt: string | null;
    deletedAt: string | null;
  },
  TId
>;

type PropertyWithOptions<TValue, TKey = 'createdAt'> = {
  value: TValue;
} & Record<TKey, string>;

type Nullable<TValue> = TValue | null;
