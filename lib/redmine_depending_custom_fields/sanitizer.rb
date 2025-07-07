module RedmineDependingCustomFields
  module Sanitizer
    def self.sanitize_dependencies(hash)
      return {} unless hash.is_a?(Hash)
      hash.each_with_object({}) do |(k, v), h|
        key = k.to_s
        next if key.blank?
        values = Array(v).map(&:to_s).reject(&:blank?)
        h[key] = values if values.any?
      end
    end
  end
end
