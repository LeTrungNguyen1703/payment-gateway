// ✅ THÊM CUSTOM VALIDATOR
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

// Custom decorator check expiry date
export function IsNotExpired(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isNotExpired',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const obj = args.object as any;
          const month = obj.expiry_month;
          const year = obj.expiry_year;

          if (!month || !year) return true; // Skip if not provided

          const now = new Date();
          const expiry = new Date(year, month - 1); // month is 0-indexed

          return expiry > now;
        },
        defaultMessage(args: ValidationArguments) {
          return 'Card has expired';
        },
      },
    });
  };
}
