require_relative 'test_helper'

class ContextMenuWizardControllerTest < ActionDispatch::IntegrationTest
  fixtures :projects, :users, :roles, :members, :member_roles,
           :issues, :trackers, :projects_trackers, :issue_statuses

  def test_save_denies_without_permission
    @request.session[:user_id] = 3
    Role.non_member.remove_permission! :edit_issues if Role.non_member.permissions.include?(:edit_issues)

    post '/depending_custom_fields/save', params: {issue_ids: '1', fieldId: 1, value: '42'}
    assert_response :forbidden
  end
end
