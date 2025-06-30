class ContextMenuWizardController < ApplicationController
  include ContextMenuWizardHelper
  before_action :require_login
  before_action :find_issues, only: %i[options save]
  before_action :check_edit_permission, only: :save

  def options
    mapping = Rails.cache.fetch('depending_custom_fields/mapping') do
      RedmineDependingCustomFields::MappingBuilder.build
    end

    if params[:parent_id].present? && params[:parent_value]
      render json: child_options(mapping)
    else
      render json: parent_options(mapping)
    end
  end

  def save
    values = extract_custom_field_values

    unless @issues.all? { |issue| issue.safe_attribute?("custom_field_values", User.current) }
      return deny_access
    end

    errors = []
    @issues.find_each do |issue|
      issue.custom_field_values = values
      issue.save
      errors.concat(issue.errors.full_messages) if issue.errors.any?
    end

    if errors.any?
      render json: { errors: errors }, status: :unprocessable_entity
    else
      head :ok
    end
  end

  private

  def extract_custom_field_values
    hash = params.dig(:issue, :custom_field_values)

    if hash.blank? && params[:fieldId]
      val = params[:value]
      return {} if val.to_s.blank?
      val = nil if val.to_s == '__none__'
      return { params[:fieldId].to_s => val }
    end

    hash = hash.to_unsafe_h if hash.respond_to?(:to_unsafe_h)
    values = {}
    hash.each do |fid, val|
      next if val.blank?
      cleaned = if val.is_a?(Array)
                  val.reject { |v| v.blank? || v == '__none__' }
                else
                  val
                end
      next if cleaned.blank?
      cleaned = nil if cleaned == '__none__' || (cleaned.is_a?(Array) && cleaned.empty?)
      values[fid.to_s] = cleaned
    end
    values
  end

  def find_issues
    ids_param = params[:ids] || params[:issue_ids] || params[:issueIds]
    ids =
      case ids_param
      when Array
        ids_param
      else
        ids_param.to_s.split(',')
      end
    ids = ids.map(&:to_i).reject(&:zero?)
    @issues = Issue.where(id: ids)
  end

  def parent_options(mapping)
    parent_ids = mapping.values.map { |i| i[:parent_id].to_i }.uniq
    parent_ids.map do |pid|
      cf = CustomField.find_by(id: pid)
      next unless cf

      allowed = intersect_allowed_values(cf, @issues) || []

      { id: cf.id, name: cf.name, values: allowed }
    end.compact
  end

  def child_options(mapping)
    pid  = params[:parent_id].to_s
    pval = params[:parent_value].to_s
    mapping.map do |cid, info|
      next unless info[:parent_id].to_s == pid
      cf = CustomField.find_by(id: cid.to_i)
      next unless cf

      allowed_by_parent = Array(info[:map][pval]).map(&:to_s)
      allowed = cf.possible_values_options(@issues).map do |o|
        o.is_a?(Array) ? o[1].to_s : o.to_s
      end
      allowed &= allowed_by_parent if allowed_by_parent.any?

      { id: cf.id, name: cf.name, values: allowed || [] }
    end.compact
  end

  def check_edit_permission
    unless @issues.all? { |issue| issue.visible? && issue.editable?(User.current) }
      deny_access
    end
  end
end
