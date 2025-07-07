module RedmineDependingCustomFields
  class MappingBuilder
    def self.build
      cfs = CustomField.where(field_format: [
        RedmineDependingCustomFields::FIELD_FORMAT_DEPENDING_LIST,
        RedmineDependingCustomFields::FIELD_FORMAT_DEPENDING_ENUMERATION
      ])

      mapping = cfs.each_with_object({}) do |cf, h|
        next unless cf.parent_custom_field_id.present?

        h[cf.id.to_s] = {
          parent_id: cf.parent_custom_field_id.to_s,
          map: RedmineDependingCustomFields::Sanitizer.sanitize_dependencies(cf.value_dependencies)
        }
      end

      mapping
    end
  end
end
