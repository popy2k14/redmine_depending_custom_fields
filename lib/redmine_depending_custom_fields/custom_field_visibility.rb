module RedmineDependingCustomFields
  module CustomFieldVisibility
    module_function

    # Returns true if the custom field is visible to the user on the given project
    def visible_to_user?(custom_field, project, user = User.current)
      return true if user.admin?
      return true if custom_field.visible?

      role_ids = Array(custom_field.role_ids)
      return false if role_ids.empty?

      user_role_ids = Array(user.roles_for_project(project)).map(&:id)
      (role_ids & user_role_ids).any?
    rescue NoMethodError
      # In case roles or project are not available, assume it's visible
      true
    end
  end
end
