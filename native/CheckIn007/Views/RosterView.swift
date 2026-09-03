import SwiftUI

/// The searchable guest roster. A `List` that stays responsive for large rosters, preserves 44 pt
/// minimum hit targets, exposes each row to VoiceOver as "name, table (or table pending)", and hides
/// a 2-second long-press admin entry behind the 007 mark.
struct RosterView: View {
    @Bindable var model: AppModel
    var onOpenAdmin: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            topBar
            List(model.filteredGuests) { guest in
                Button {
                    model.unlockAudioFromGesture()
                    model.selectGuest(guest)
                } label: {
                    rosterRow(guest)
                }
                .buttonStyle(.plain)
                .listRowBackground(Theme.surface)
                .frame(minHeight: Theme.Spacing.minimumHitTarget)
                .accessibilityIdentifier(A11y.rosterRow(guest.id))
                .accessibilityLabel(accessibilityLabel(for: guest))
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .background(Theme.background)
            .searchable(text: $model.query, prompt: "Search agents")
            .accessibilityIdentifier(A11y.rosterSearch)
        }
        .background(Theme.background.ignoresSafeArea())
    }

    private var topBar: some View {
        HStack {
            Text("007")
                .font(Theme.Typography.title)
                .foregroundStyle(Theme.accent)
                .padding(Theme.Spacing.regular)
                .frame(minWidth: Theme.Spacing.minimumHitTarget, minHeight: Theme.Spacing.minimumHitTarget)
                .contentShape(Rectangle())
                .accessibilityIdentifier(A11y.mark007)
                .accessibilityLabel("Admin (long press)")
                .accessibilityAddTraits(.isButton)
                .onLongPressGesture(minimumDuration: 2.0) {
                    onOpenAdmin()
                }
            Spacer()
            Text("CHECK-IN")
                .font(Theme.Typography.caption)
                .foregroundStyle(Theme.secondaryText)
                .padding(.trailing, Theme.Spacing.regular)
        }
        .background(Theme.surface)
    }

    private func rosterRow(_ guest: Guest) -> some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.tight) {
            Text(guest.name)
                .font(Theme.Typography.body)
                .foregroundStyle(Theme.primaryText)
            Text(guest.table.isEmpty ? "TABLE PENDING" : guest.table)
                .font(Theme.Typography.caption)
                .foregroundStyle(Theme.secondaryText)
        }
        .padding(.vertical, Theme.Spacing.tight)
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentShape(Rectangle())
    }

    private func accessibilityLabel(for guest: Guest) -> String {
        "\(guest.name), \(guest.table.isEmpty ? "table pending" : guest.table)"
    }
}
