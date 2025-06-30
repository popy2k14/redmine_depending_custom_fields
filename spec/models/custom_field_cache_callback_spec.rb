require 'rails_helper'

RSpec.describe 'CustomField cache clearing callback' do
  before do
    allow(Rails.cache).to receive(:delete)
    allow(Rails.cache).to receive(:delete_matched)
  end

  let(:dummy_class) do
    Class.new do
      include RedmineDependingCustomFields::Patches::CustomFieldPatch
      attr_accessor :format
    end
  end

  it 'clears caches for dependable list field' do
    cf = dummy_class.new
    cf.format = RedmineDependingCustomFields::DependableListFormat.new
    cf.send(:dispatch_after_custom_field_save)
    expect(Rails.cache).to have_received(:delete).with('depending_custom_fields/mapping')
    expect(Rails.cache).to have_received(:delete_matched).with('dcf/*')
  end

  it 'clears caches for dependable enumeration field' do
    cf = dummy_class.new
    cf.format = RedmineDependingCustomFields::DependableEnumerationFormat.new
    cf.send(:dispatch_after_custom_field_save)
    expect(Rails.cache).to have_received(:delete).with('depending_custom_fields/mapping')
    expect(Rails.cache).to have_received(:delete_matched).with('dcf/*')
  end
end
