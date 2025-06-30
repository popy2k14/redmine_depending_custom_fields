require_dependency 'custom_fields_helper'

module RedmineDependingCustomFields
  module Hooks
    class ContextMenuHook < Redmine::Hook::ViewListener
      def view_issues_context_menu_end(ctx = {})
        issues  = Array(ctx[:issues])
        user    = ctx[:controller].try(:current_user) || User.current

        return if issues.any? {|issue| !user.allowed_to?(:edit_issues, issue.project)}

        parents = ParentMenuBuilder.build(issues)
        mapping = Rails.cache.fetch('depending_custom_fields/mapping') do
          MappingBuilder.build
        end

        view_context = ctx[:controller].view_context
        view_context.extend(CustomFieldsHelper)
        view_context.extend(ContextMenuWizardHelper)

        view_context.render(
          partial: 'depending_custom_fields/context_menu_wizard',
          collection: parents,
          as: :parent,
          locals: { issues: issues, mapping: mapping }
        )
      end
    end
  end
end
