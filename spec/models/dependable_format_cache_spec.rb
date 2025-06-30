require 'rails_helper'

RSpec.describe 'Dependable format cache clearing' do
  let(:cf) { instance_double(CustomField) }

  before do
    allow(Rails.cache).to receive(:delete)
    allow(Rails.cache).to receive(:delete_matched)
  end

  it 'clears caches for list format' do
    format = RedmineDependingCustomFields::DependableListFormat.new
    format.after_custom_field_save(cf)
    expect(Rails.cache).to have_received(:delete).with('depending_custom_fields/mapping')
    expect(Rails.cache).to have_received(:delete_matched).with('dcf/*')
  end

  it 'clears caches for enumeration format' do
    format = RedmineDependingCustomFields::DependableEnumerationFormat.new
    format.after_custom_field_save(cf)
    expect(Rails.cache).to have_received(:delete).with('depending_custom_fields/mapping')
    expect(Rails.cache).to have_received(:delete_matched).with('dcf/*')
  end
end
