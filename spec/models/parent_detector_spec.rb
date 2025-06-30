require 'rails_helper'

RSpec.describe RedmineDependingCustomFields::ParentDetector do
  let(:parent1) { instance_double(CustomField, id: 10, position: 1) }
  let(:parent2) { instance_double(CustomField, id: 12, position: 2) }
  let(:project)  { instance_double(Project) }
  let(:issue1)   { instance_double(Issue, project: project, available_custom_fields: [parent1, parent2]) }
  let(:issue2)   { instance_double(Issue, project: project, available_custom_fields: [parent1, parent2]) }

  before do
    allow(Rails.cache).to receive(:fetch).and_return({
      '31' => { parent_id: '10', map: {} },
      '32' => { parent_id: '12', map: {} }
    })
    allow(CustomField).to receive(:where).and_return([parent1, parent2])
  end

  it 'returns parent fields ordered by position' do
    result = described_class.for_issues([issue1, issue2])
    expect(result).to eq([parent1, parent2])
  end

  it 'excludes fields not available for all issues' do
    issue2 = instance_double(Issue, project: project, available_custom_fields: [parent1])
    result = described_class.for_issues([issue1, issue2])
    expect(result).to eq([parent1])
  end
end
