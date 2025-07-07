require_relative '../rails_helper'

RSpec.describe RedmineDependingCustomFields::DependingEnumerationFormat do
  let(:format) { described_class.instance }

  describe '#before_custom_field_save' do
    let(:custom_field) do
      Struct.new(:id, :type, :field_format, :parent_custom_field_id, :value_dependencies).new(
        11,
        'IssueCustomField',
        RedmineDependingCustomFields::FIELD_FORMAT_DEPENDING_ENUMERATION,
        '5',
        { '1' => ['2'] }
      )
    end

    context 'when a matching parent exists' do
      let(:parent) { Struct.new(:id).new(5) }

      before do
        allow(CustomField).to receive(:find_by).with(
          id: 5,
          type: custom_field.type,
          field_format: ['enumeration', RedmineDependingCustomFields::FIELD_FORMAT_DEPENDING_ENUMERATION]
        ).and_return(parent)
        allow(RedmineDependingCustomFields::Sanitizer).to receive(:sanitize_dependencies)
          .with(custom_field.value_dependencies).and_return(custom_field.value_dependencies)
      end

      it 'sets the parent_custom_field_id to the resolved parent id' do
        format.before_custom_field_save(custom_field)
        expect(custom_field.parent_custom_field_id).to eq(parent.id)
      end

      it 'sanitizes the value_dependencies' do
        format.before_custom_field_save(custom_field)
        expect(RedmineDependingCustomFields::Sanitizer)
          .to have_received(:sanitize_dependencies).with(custom_field.value_dependencies)
      end
    end

    context 'when no matching parent exists' do
      before do
        allow(CustomField).to receive(:find_by).and_return(nil)
        allow(RedmineDependingCustomFields::Sanitizer).to receive(:sanitize_dependencies).and_return({})
      end

      it 'clears the parent_custom_field_id' do
        format.before_custom_field_save(custom_field)
        expect(custom_field.parent_custom_field_id).to be_nil
      end

      it 'sanitizes the value_dependencies' do
        format.before_custom_field_save(custom_field)
        expect(custom_field.value_dependencies).to eq({})
      end
    end
  end
end
